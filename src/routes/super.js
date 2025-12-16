const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const superAdmin = require('../middleware/super'); // We will create this middleware next
const { College, User, Company, Skill } = require('../models/associations');
const bcrypt = require('bcryptjs');

// ==========================================
// COLLEGE MANAGEMENT ROUTES
// ==========================================

// GET /api/super/colleges
// List all colleges with admin count
router.get('/colleges', [auth, superAdmin], async (req, res) => {
    try {
        const colleges = await College.findAll({
            include: [{
                model: User,
                // as: 'users', // Removed incorrect alias
                where: { role: 'COLLEGE_ADMIN' },
                attributes: ['id'],
                required: false
            }]
        });

        const collegesWithCount = colleges.map(college => ({
            ...college.toJSON(),
            adminCount: college.Users ? college.Users.length : 0 // Access via default alias 'Users'
        }));

        res.json(collegesWithCount);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/super/colleges
// Create a new college and optionally an admin
router.post('/colleges', [auth, superAdmin], async (req, res) => {
    const { name, subdomain, location, website, logoUrl, adminEmail, adminUsername, adminPassword } = req.body;
    const t = await require('../database').transaction();

    try {
        let college = await College.findOne({ where: { subdomain } });
        if (college) {
            await t.rollback();
            return res.status(400).json({ msg: 'Subdomain already exists' });
        }

        if (adminEmail) {
            let user = await User.findOne({ where: { email: adminEmail } });
            if (user) {
                await t.rollback();
                return res.status(400).json({ msg: 'Admin email already exists' });
            }
        }

        college = await College.create({
            name,
            subdomain,
            location,
            website,
            logoUrl
        }, { transaction: t });

        if (adminEmail && adminUsername && adminPassword) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(adminPassword, salt);

            await User.create({
                username: adminUsername,
                email: adminEmail,
                passwordHash,
                role: 'COLLEGE_ADMIN',
                collegeId: college.id
            }, { transaction: t });
        }

        await t.commit();
        res.json(college);
    } catch (err) {
        await t.rollback();
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/super/colleges/:id/admin
// Create an admin for a specific college
router.post('/colleges/:id/admins', [auth, superAdmin], async (req, res) => {
    const { username, email, password } = req.body;
    const collegeId = req.params.id;

    try {
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        user = await User.create({
            username,
            email,
            passwordHash,
            role: 'COLLEGE_ADMIN',
            collegeId
        });

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// COMPANY MANAGEMENT ROUTES
// ==========================================

// GET /api/super/companies
// List all companies
router.get('/companies', [auth, superAdmin], async (req, res) => {
    try {
        const companies = await Company.findAll({
            order: [['name', 'ASC']]
        });
        res.json(companies);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/super/companies
// Create a new company
router.post('/companies', [auth, superAdmin], async (req, res) => {
    const { name, website, location, description, industry, size, foundedYear, linkedinUrl, logoUrl, isVerified } = req.body;
    try {
        const newCompany = await Company.create({
            name,
            website,
            location,
            description,
            industry,
            size,
            foundedYear,
            linkedinUrl,
            logoUrl,
            isVerified
        });
        res.status(201).json(newCompany);
    } catch (err) {
        console.error(err.message);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ msg: 'Company already exists.' });
        }
        res.status(500).send('Server Error');
    }
});

// PUT /api/super/companies/:id
// Update a company
router.put('/companies/:id', [auth, superAdmin], async (req, res) => {
    const { name, website, location, description, industry, size, foundedYear, linkedinUrl, logoUrl, isVerified } = req.body;
    try {
        const company = await Company.findByPk(req.params.id);
        if (!company) {
            return res.status(404).json({ msg: 'Company not found' });
        }

        company.name = name || company.name;
        company.website = website || company.website;
        company.location = location || company.location;
        company.description = description || company.description;
        company.industry = industry || company.industry;
        company.size = size || company.size;
        company.foundedYear = foundedYear || company.foundedYear;
        company.linkedinUrl = linkedinUrl || company.linkedinUrl;
        company.logoUrl = logoUrl || company.logoUrl;
        if (isVerified !== undefined) company.isVerified = isVerified;

        await company.save();
        res.json(company);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/super/companies/:id
// Delete a company
router.delete('/companies/:id', [auth, superAdmin], async (req, res) => {
    try {
        const company = await Company.findByPk(req.params.id);
        if (!company) {
            return res.status(404).json({ msg: 'Company not found' });
        }
        await company.destroy();
        res.json({ msg: 'Company removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// SKILL MANAGEMENT ROUTES
// ==========================================

// GET /api/super/skills
// List all skills
router.get('/skills', [auth, superAdmin], async (req, res) => {
    try {
        const skills = await Skill.findAll({
            order: [['name', 'ASC']]
        });
        res.json(skills);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/super/skills
// Create a new skill
router.post('/skills', [auth, superAdmin], async (req, res) => {
    const { name, category, description, isTechnical, iconUrl } = req.body;
    try {
        const newSkill = await Skill.create({
            name,
            category,
            description,
            isTechnical,
            iconUrl
        });
        res.status(201).json(newSkill);
    } catch (err) {
        console.error(err.message);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ msg: 'Skill already exists.' });
        }
        res.status(500).send('Server Error');
    }
});

// PUT /api/super/skills/:id
// Update a skill
router.put('/skills/:id', [auth, superAdmin], async (req, res) => {
    const { name, category, description, isTechnical, iconUrl } = req.body;
    try {
        const skill = await Skill.findByPk(req.params.id);
        if (!skill) {
            return res.status(404).json({ msg: 'Skill not found' });
        }

        skill.name = name || skill.name;
        skill.category = category || skill.category;
        skill.description = description || skill.description;
        if (isTechnical !== undefined) skill.isTechnical = isTechnical;
        skill.iconUrl = iconUrl || skill.iconUrl;

        await skill.save();
        res.json(skill);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/super/skills/:id
// Delete a skill
router.delete('/skills/:id', [auth, superAdmin], async (req, res) => {
    try {
        const skill = await Skill.findByPk(req.params.id);
        if (!skill) {
            return res.status(404).json({ msg: 'Skill not found' });
        }
        await skill.destroy();
        res.json({ msg: 'Skill removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
