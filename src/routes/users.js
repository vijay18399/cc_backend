const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { User, Profile, Experience, Skill, Company, UserSkill, Portfolio } = require('../models/associations');
const path = require('path'); // Import path module
const fs = require('fs');
const sequelize = require('../database');

// GET /api/users
// Search for users with pagination
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 10, search, skill, company } = req.query;
  const offset = (page - 1) * limit;

  try {
    const whereClause = {};
    const include = [{ model: Profile, where: {} }, { model: Skill }];

    // College restriction
    if (req.user.role !== 'SUPER_ADMIN') {
      whereClause.collegeId = req.user.collegeId;
    }

    // User Type Filter
    if (req.query.userType) {
      const type = req.query.userType.toUpperCase();
      if (['STUDENT', 'ALUMNI'].includes(type)) {
        whereClause.role = type;
      }
    }

    if (search) {
      include[0].where.fullName = { [Op.like]: `%${search}%` };
    }
    if (company) {
      const companies = company.split(',').map(c => c.trim()).filter(c => c);
      if (companies.length > 0) {
        // Add Experience -> Company to include if not already there (it's not by default for list)
        // We need to ensure we only get users who have worked at these companies.
        // Adding required: true to the include makes it an INNER JOIN.
        const companyConditions = companies.map(c => ({ name: { [Op.like]: `%${c}%` } }));

        include.push({
          model: Experience,
          required: true, // Only return users who have matching experiences
          include: [{
            model: Company,
            where: { [Op.or]: companyConditions },
            required: true
          }]
        });
      }
    }

    if (skill) {
      const skills = skill.split(',').map(s => s.trim()).filter(s => s);
      if (skills.length > 0) {
        const skillConditions = skills.map(s => ({ name: { [Op.like]: `%${s}%` } }));
        include[1].where = { [Op.or]: skillConditions };
      }
    }

    // New Filters: Graduation Year, Department, Section
    const { graduationYear, department, section } = req.query;

    if (graduationYear) {
      const years = graduationYear.split(',').map(y => y.trim()).filter(y => y);
      if (years.length > 0) {
        include[0].where.graduationYear = { [Op.in]: years };
      }
    }

    if (department) {
      const depts = department.split(',').map(d => d.trim()).filter(d => d);
      if (depts.length > 0) {
        // Use like for partial matches or in for exact? Usually departments are exact enum-like strings.
        // Let's use IN for exact matches if user selects from dropdown.
        include[0].where.department = { [Op.in]: depts };
      }
    }

    if (section) {
      const sections = section.split(',').map(s => s.trim()).filter(s => s);
      if (sections.length > 0) {
        include[0].where.section = { [Op.in]: sections };
      }
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      include: include,
      attributes: { exclude: ['passwordHash'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['username', 'ASC']],
      distinct: true,
    });

    res.json({
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      users: rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// GET /api/users/me
// Fetch the complete profile for the logged-in user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        { model: Profile },
        { model: Experience, include: [{ model: Company }] },
        { model: Skill, through: { attributes: [] } } // Exclude junction table attributes
      ],
      order: [[Experience, 'startDate', 'DESC']]
    });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/users/:username
// Fetch the public profile for a specific user
router.get('/:username', auth, async (req, res) => {
  try {
    const targetUser = await User.findOne({
      where: { username: req.params.username },
      attributes: ['id', 'collegeId']
    });

    if (!targetUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Allow access if users are from the same college or if the requester is a SUPER_ADMIN
    if (req.user.role !== 'SUPER_ADMIN' && req.user.collegeId !== targetUser.collegeId) {
      return res.status(403).json({ msg: 'Access denied. You can only view profiles from your own college.' });
    }

    const userProfile = await User.findByPk(targetUser.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        { model: Profile },
        { model: Experience, include: [{ model: Company }] },
        { model: Skill, through: { attributes: [] } },
        { model: Portfolio }
      ],
      order: [[Experience, 'startDate', 'DESC']]
    });

    res.json(userProfile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/users/me/profile
// Update a user's own profile
router.put('/me/profile', auth, async (req, res) => {
  const { fullName, bio, department, section, graduationYear, profilePictureUrl } = req.body;

  try {
    let profile = await Profile.findOne({ where: { userId: req.user.id } });

    if (!profile) {
      // Create a new profile if it doesn't exist
      profile = await Profile.create({
        userId: req.user.id,
        fullName,
        bio,
        department,
        section,
        graduationYear,
        profilePictureUrl
      });
    } else {
      // Update existing profile
      profile.fullName = fullName;
      profile.bio = bio;
      profile.department = department;
      profile.section = section;
      profile.graduationYear = graduationYear;
      profile.profilePictureUrl = profilePictureUrl;
      await profile.save();
    }
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/users/me/career
// Update/replace all career experiences and skills for the logged-in user
router.put('/me/career', auth, async (req, res) => {
  const { experiences, skills, city, country, locality } = req.body; // experiences is an array of objects, skills is an array of skill names

  try {
    await sequelize.transaction(async (t) => {
      // --- Handle Experiences ---
      // Delete all existing experiences for the user
      await Experience.destroy({ where: { userId: req.user.id }, transaction: t });

      // Create new experiences
      if (experiences && experiences.length > 0) {
        for (const exp of experiences) {
          let company = await Company.findOne({ where: { name: exp.companyName }, transaction: t });
          if (!company) {
            company = await Company.create({ name: exp.companyName }, { transaction: t });
          }
          await Experience.create({
            userId: req.user.id,
            companyId: company.id,
            title: exp.title,
            startDate: exp.startDate,
            endDate: exp.endDate,
            description: exp.description
          }, { transaction: t });
        }
      }

      // --- Handle Skills ---
      // Delete all existing user skills
      await UserSkill.destroy({ where: { userId: req.user.id }, transaction: t });

      // Create new user skills
      if (skills && skills.length > 0) {
        for (const skillName of skills) {
          let skill = await Skill.findOne({ where: { name: skillName }, transaction: t });
          if (!skill) {
            skill = await Skill.create({ name: skillName }, { transaction: t });
          }
          await UserSkill.create({
            userId: req.user.id,
            skillId: skill.id
          }, { transaction: t });
        }
      }

      // --- Handle Location ---
      if (city !== undefined || country !== undefined || locality !== undefined) {
        await Profile.update({ city, country, locality }, { where: { userId: req.user.id }, transaction: t });
      }
    });
    console.log("---done")
    // Fetch and return the updated user profile with experiences and skills
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        { model: Profile },
        { model: Experience, include: [{ model: Company }] },
        { model: Skill, through: { attributes: [] } },
        { model: Portfolio }
      ],
      order: [[Experience, 'startDate', 'DESC']]
    });
    res.json(user);

  } catch (err) {
    console.error(err);
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

const multer = require('multer');
const resumeParser = require('../utility/resume-parser');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/resumes/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Save as [rollNumber].pdf, overwriting any existing file for this user
    cb(null, `${req.user.username}.pdf`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// POST /api/users/me/parse-resume
router.post('/me/parse-resume', [auth, upload.single('resume')], async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    // Also save as profile resume
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    let profile = await Profile.findOne({ where: { userId: req.user.id } });

    if (profile) {
      profile.resumeUrl = resumeUrl;
      await profile.save();
    } else {
      // Create if not exists (though it should usually exist)
      await Profile.create({
        userId: req.user.id,
        resumeUrl: resumeUrl
      });
    }

    const parsedJson = await resumeParser(req.file.path); // Corrected: Pass object with buffer
    res.json(parsedJson);
  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).send('Failed to parse resume.');
  }
});

// POST /api/users/me/resume
// Upload a resume for the user's profile (display/download purposes)
router.post('/me/resume', [auth, upload.single('resume')], async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    // Construct the URL for the uploaded file
    // Assuming the server is serving 'uploads' statically at /uploads
    // We need to store the relative path or full URL. Relative is usually better.
    // req.file.path is the absolute path on disk.
    // We want something like '/uploads/resumes/filename.pdf'

    // Since multer destination is 'uploads/resumes/', and we serve 'uploads' at '/uploads'
    // The path should be '/uploads/resumes/' + filename

    const resumeUrl = `/uploads/resumes/${req.file.filename}`;

    let profile = await Profile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      // Should exist if they are uploading a resume, but just in case
      profile = await Profile.create({ userId: req.user.id, fullName: req.user.username });
    }

    profile.resumeUrl = resumeUrl;
    await profile.save();

    res.json({ success: true, resumeUrl });

  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).send('Failed to upload resume.');
  }
});



module.exports = router;
