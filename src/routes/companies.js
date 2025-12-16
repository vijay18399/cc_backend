const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { Company, Experience, User, Skill } = require('../models/associations');

// GET /api/companies
// Search for companies by skills
router.get('/', auth, async (req, res) => {
    const { skill } = req.query;

    try {
        const include = {
            model: Experience,
            include: {
                model: User,
                include: {
                    model: Skill,
                    where: { name: { [Op.like]: `%${skill}%` } },
                },
                where: {},
                required: true,
            },
            required: true,
        };

        // Restrict to user's college if not a SUPER_ADMIN
        if (req.user.role !== 'SUPER_ADMIN') {
            include.include.include.where.collegeId = req.user.collegeId;
        }

        const companies = await Company.findAll({
            include: [include],
            distinct: true,
        });

        res.json(companies);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/companies/search
// Search for companies by name (for autocomplete)
router.get('/search', auth, async (req, res) => {
    const { query } = req.query;
    try {
        const companies = await Company.findAll({
            where: {
                name: { [Op.like]: `%${query}%` }
            },
            limit: 10,
            attributes: ['id', 'name']
        });
        res.json(companies);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
