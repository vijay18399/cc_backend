const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const bcrypt = require('bcryptjs');

const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { User, Profile } = require('../models/associations');

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/admin/users
// List all users within the admin's college with pagination and search
router.get('/users', [auth, admin], async (req, res) => {
    const { page = 1, limit = 10, search, role } = req.query;
    const offset = (page - 1) * limit;

    try {
        const whereClause = {
            collegeId: req.user.collegeId,
            // role: { [Op.ne]: 'COLLEGE_ADMIN' }
        };

        if (search) {
            whereClause[Op.or] = [
                { username: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { '$Profile.fullName$': { [Op.like]: `%${search}%` } }
            ];
        }

        if (role) {
            whereClause.role = role;
        }

        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            include: [{ model: Profile }],
            attributes: { exclude: ['passwordHash'] },
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['username', 'ASC']]
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

// POST /api/admin/users/parse-csv
// Parse CSV and return JSON for review
router.post('/users/parse-csv', [auth, admin, upload.single('file')], (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());

    stream
        .pipe(csv())
        .on('data', (data) => {
            // Normalize keys to lowercase? User requested "backend should parse".
            // Let's assume CSV headers match our expected fields or we try to map them.
            // For now, pass through the data as read.
            // Add default structure if needed, e.g., role if missing.
            results.push({
                ...data,
                role: data.role || 'STUDENT' // Default role
            });
        })
        .on('end', () => {
            res.json(results);
        })
        .on('error', (err) => {
            console.error('CSV Parsing Error:', err);
            res.status(500).send('Error parsing CSV file.');
        });
});

// POST /api/admin/users/sync
// Sync (Create/Update) users from JSON data
router.post('/users/sync', [auth, admin], async (req, res) => {
    const { users } = req.body; // Expecting array of users

    if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).send('No user data provided.');
    }

    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    for (const item of users) {
        const { rollNumber, name, department, section, graduationYear, dob, role } = item;

        // Basic Validation
        if (!rollNumber || !name) {
            results.failed++;
            results.errors.push({ user: item, error: 'Missing required fields (rollNumber, name)' });
            continue;
        }

        try {
            // Password Logic: If dob is present, use it? Or default logic?
            // Previous logic: first 4 of name + last 2 of rollNumber.
            // Let's stick to a default logic if not provided or use what was in previous import.
            // The previous code used: name.substring(0, 4) + rollNumber.slice(-2)

            let passwordHash;
            // Generate password only if creating new user or explicitly resetting?
            // Ideally we check if user exists first.

            const existingUser = await User.findOne({ where: { username: rollNumber, collegeId: req.user.collegeId } });

            if (!existingUser) {
                // New User - Generate Password
                const namePart = name.substring(0, 4);
                const rollNumberPart = rollNumber.toString().slice(-2);
                const password = `${namePart}${rollNumberPart}`;
                const salt = await bcrypt.genSalt(10);
                passwordHash = await bcrypt.hash(password, salt);
            }

            const [user, created] = await User.findOrCreate({
                where: { username: rollNumber, collegeId: req.user.collegeId },
                defaults: {
                    passwordHash: passwordHash, // Set only if creating
                    email: item.email || `${rollNumber.toLowerCase()}@${req.user.collegeId}.edu`, // Fallback email
                    role: role || 'STUDENT',
                    dob: dob || null
                }
            });

            if (!created) {
                // Update existing user if needed
                // Optionally update role if changed in review
                if (role && user.role !== role) {
                    user.role = role;
                    await user.save();
                }
                // We typically don't reset password on sync unless requested, so skip hash update
            }

            // Create or update profile
            await Profile.upsert({
                userId: user.id,
                fullName: name,
                department: department,
                section: section,
                graduationYear: graduationYear
            });

            results.success++;
        } catch (err) {
            console.error('Sync Error:', err);
            results.failed++;
            results.errors.push({ user: item, error: err.message });
        }
    }

    res.json({
        message: 'Sync Process Completed',
        results
    });
});

// PUT /api/admin/users/bulk-update-role
// Bulk update user roles by a list of user IDs
router.put('/users/bulk-update-role', [auth, admin], async (req, res) => {
    const { userIds, newRole } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0 || !newRole) {
        return res.status(400).json({ msg: 'An array of userIds and a newRole are required.' });
    }

    // Validate the role
    const allowedRoles = ['STUDENT', 'ALUMNI', 'FACULTY'];
    if (!allowedRoles.includes(newRole)) {
        return res.status(400).json({ msg: 'Invalid role. Can only update to STUDENT, ALUMNI, or FACULTY.' });
    }

    try {
        const [updateCount] = await User.update(
            { role: newRole },
            {
                where: {
                    id: { [Op.in]: userIds },
                    collegeId: req.user.collegeId // Ensure admin can only update users in their own college
                }
            }
        );

        if (updateCount === 0) {
            return res.status(404).json({ msg: 'No matching users found in your college to update.' });
        }

        res.json({
            message: `Successfully updated ${updateCount} users to role '${newRole}'.`,
            count: updateCount
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;