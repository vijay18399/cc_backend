const express = require('express');
const router = express.Router();
const { sequelize } = require('../models/associations');
const auth = require('../middleware/auth');
const { Skill, UserSkill, Experience, Company, User } = require('../models/associations');

// GET /api/dashboard/skills-distribution
router.get('/skills-distribution', auth, async (req, res) => {
    try {
        const skillsDistribution = await Skill.findAll({
            attributes: [
                'name',
                [sequelize.fn('COUNT', sequelize.col('UserSkills.id')), 'userCount']
            ],
            include: [{
                model: UserSkill,
                attributes: [],
                include: [{
                    model: User,
                    where: req.user.role !== 'SUPER_ADMIN' ? { collegeId: req.user.collegeId } : {},
                    attributes: []
                }]
            }],
            group: ['Skill.id'],
            order: [[sequelize.literal('userCount'), 'DESC']],
            limit: 10 // Top 10 skills
        });
        res.json(skillsDistribution);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/dashboard/experience-distribution
router.get('/experience-distribution', auth, async (req, res) => {
    // This is a simplified example. A more accurate calculation would be needed for real-world scenarios.
    try {
        const experienceDistribution = await Experience.findAll({
            attributes: [
                [sequelize.fn('strftime', '%Y', sequelize.col('startDate')), 'year'],
                [sequelize.fn('COUNT', sequelize.col('Experience.id')), 'experienceCount']
            ],
            include: [{
                model: User,
                where: req.user.role !== 'SUPER_ADMIN' ? { collegeId: req.user.collegeId } : {},
                attributes: []
            }],
            group: ['year'],
            order: [[sequelize.literal('year'), 'ASC']]
        });
        res.json(experienceDistribution);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/dashboard/company-distribution
router.get('/company-distribution', auth, async (req, res) => {
    try {
        const companyDistribution = await Company.findAll({
            attributes: [
                'name',
                [sequelize.fn('COUNT', sequelize.col('Experiences.id')), 'employeeCount']
            ],
            include: [{
                model: Experience,
                attributes: [],
                include: [{
                    model: User,
                    where: req.user.role !== 'SUPER_ADMIN' ? { collegeId: req.user.collegeId } : {},
                    attributes: []
                }]
            }],
            group: ['Company.id'],
            order: [[sequelize.literal('employeeCount'), 'DESC']],
            limit: 10 // Top 10 companies
        });
        res.json(companyDistribution);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
