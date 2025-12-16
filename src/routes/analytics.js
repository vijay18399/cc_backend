const express = require('express');
const router = express.Router();
const { Sequelize, Op } = require('sequelize');
const auth = require('../middleware/auth');
const { User, Profile, Experience, Company, Skill, UserSkill } = require('../models/associations');

router.get('/countries', auth, async (req, res) => {
    try {
        const collegeId = req.user.collegeId;
        const { graduationYear, department } = req.query;

        const whereClause = {
            country: {
                [Op.ne]: null,
                [Op.ne]: ''
            }
        };

        if (graduationYear) whereClause.graduationYear = { [Op.in]: graduationYear.split(',') };
        if (department) whereClause.department = { [Op.in]: department.split(',') };

        const countryStats = await Profile.findAll({
            attributes: [
                'country',
                [Sequelize.literal('COUNT(*)'), 'count']
            ],
            include: [{
                model: User,
                attributes: [],
                where: { collegeId }
            }],
            group: ['country'],
            order: [[Sequelize.literal('count'), 'DESC']],
            where: whereClause,
            limit: 10
        });

        // Format for Recharts
        const data = countryStats.map(stat => ({
            name: stat.country,
            value: parseInt(stat.getDataValue('count'))
        }));

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


router.get('/departments', auth, async (req, res) => {
    try {
        const collegeId = req.user.collegeId;
        const departments = await Profile.findAll({
            attributes: ['department'],
            include: [{
                model: User,
                attributes: [],
                where: { collegeId }
            }],
            where: {
                department: { [Op.ne]: null, [Op.ne]: '' }
            },
            group: ['department'],
            order: [['department', 'ASC']]
        });
        res.json(departments.map(d => d.department));
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


router.get('/employers', auth, async (req, res) => {
    try {
        const collegeId = req.user.collegeId;
        const { graduationYear, department } = req.query;

        // Base where for Experience: current jobs only (endDate is null)
        const experienceWhere = {
            endDate: null
        };

        // User Include with optional Profile filter
        const userInclude = {
            model: User,
            where: { collegeId },
            attributes: [],
            include: []
        };

        if (graduationYear || department) {
            const profileWhere = {};
            if (graduationYear) profileWhere.graduationYear = { [Op.in]: graduationYear.split(',') };
            if (department) profileWhere.department = { [Op.in]: department.split(',') };

            userInclude.include.push({
                model: Profile,
                where: profileWhere,
                attributes: []
            });
        }

        const employers = await Experience.findAll({
            attributes: [
                [Sequelize.literal('COUNT(*)'), 'count']
            ],
            include: [
                { model: Company, attributes: ['name'] },
                userInclude
            ],
            where: experienceWhere,
            group: ['companyId', 'Company.id', 'Company.name'],
            order: [[Sequelize.literal('count'), 'DESC']],
            limit: 10
        });

        const data = employers.map(e => ({
            name: e.Company ? e.Company.name : 'Unknown',
            value: parseInt(e.getDataValue('count'))
        }));

        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


router.get('/skills', auth, async (req, res) => {
    try {
        const collegeId = req.user.collegeId;
        const { graduationYear, department } = req.query;

        // User Include with optional Profile filter
        const userInclude = {
            model: User,
            where: { collegeId },
            attributes: [],
            include: []
        };

        if (graduationYear || department) {
            const profileWhere = {};
            if (graduationYear) profileWhere.graduationYear = { [Op.in]: graduationYear.split(',') };
            if (department) profileWhere.department = { [Op.in]: department.split(',') };

            userInclude.include.push({
                model: Profile,
                where: profileWhere,
                attributes: []
            });
        }

        const topSkillsRaw = await UserSkill.findAll({
            attributes: [
                [Sequelize.literal('COUNT(*)'), 'count']
            ],
            include: [
                { model: Skill, attributes: ['name'] },
                userInclude
            ],
            group: ['skillId', 'Skill.id', 'Skill.name'],
            order: [[Sequelize.literal('count'), 'DESC']],
            limit: 10
        });

        const data = topSkillsRaw.map(item => ({
            name: item.Skill ? item.Skill.name : 'Unknown',
            value: parseInt(item.getDataValue('count'))
        }));

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


router.get('/designations', auth, async (req, res) => {
    try {
        const collegeId = req.user.collegeId;
        const { graduationYear, department } = req.query;

        const experienceWhere = {
            endDate: null,
            title: {
                [Op.ne]: null,
                [Op.ne]: ''
            }
        };

        const userInclude = {
            model: User,
            where: { collegeId },
            attributes: [],
            include: []
        };

        if (graduationYear || department) {
            const profileWhere = {};
            if (graduationYear) profileWhere.graduationYear = { [Op.in]: graduationYear.split(',') };
            if (department) profileWhere.department = { [Op.in]: department.split(',') };

            userInclude.include.push({
                model: Profile,
                where: profileWhere,
                attributes: []
            });
        }

        const stats = await Experience.findAll({
            attributes: [
                'title',
                [Sequelize.literal('COUNT(*)'), 'count']
            ],
            include: [userInclude],
            where: experienceWhere,
            group: ['title'],
            order: [[Sequelize.literal('count'), 'DESC']],
            limit: 10
        });

        const data = stats.map(s => ({
            name: s.title,
            value: parseInt(s.getDataValue('count'))
        }));

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/summary', auth, async (req, res) => {
    try {
        const collegeId = req.user.collegeId;
        const { graduationYear, department } = req.query;

        const profileWhere = {};
        if (graduationYear) profileWhere.graduationYear = { [Op.in]: graduationYear.split(',') };
        if (department) profileWhere.department = { [Op.in]: department.split(',') };

        // 1. Total Alumni (Profile Count)
        const totalAlumni = await Profile.count({
            where: profileWhere,
            include: [{
                model: User,
                attributes: [],
                where: { collegeId }
            }]
        });

        // 2. Global Reach (Countries)
        const globalReach = await Profile.count({
            where: {
                ...profileWhere,
                country: { [Op.ne]: null, [Op.ne]: '' }
            },
            include: [{
                model: User,
                attributes: [],
                where: { collegeId }
            }],
            distinct: true,
            col: 'country'
        });

        // 3. Corporate Footprint (Unique Companies)
        // Join User -> Profile to filter
        const expUserInclude = {
            model: User,
            where: { collegeId },
            attributes: [],
            include: []
        };
        if (Object.keys(profileWhere).length > 0) {
            expUserInclude.include.push({
                model: Profile,
                where: profileWhere,
                attributes: []
            });
        }

        const corporateFootprint = await Experience.count({
            include: [expUserInclude],
            distinct: true,
            col: 'companyId'
        });

        // 4. Skill Velocity (Unique Skills)
        const skillUserInclude = {
            model: User,
            where: { collegeId },
            attributes: [],
            include: []
        };
        if (Object.keys(profileWhere).length > 0) {
            skillUserInclude.include.push({
                model: Profile,
                where: profileWhere,
                attributes: []
            });
        }

        const skillVelocity = await UserSkill.count({
            include: [skillUserInclude],
            distinct: true,
            col: 'skillId'
        });

        res.json({
            totalAlumni,
            globalReach,
            corporateFootprint,
            skillVelocity
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/batch-trends', auth, async (req, res) => {
    try {
        const collegeId = req.user.collegeId;
        const { graduationYear, department } = req.query;

        const whereClause = {
            graduationYear: { [Op.ne]: null }
        };

        if (graduationYear) whereClause.graduationYear = { [Op.in]: graduationYear.split(',') };
        if (department) whereClause.department = { [Op.in]: department.split(',') };

        const trends = await Profile.findAll({
            attributes: [
                'graduationYear',
                [Sequelize.literal('COUNT(*)'), 'count']
            ],
            where: whereClause,
            include: [{
                model: User,
                attributes: [],
                where: { collegeId }
            }],
            group: ['graduationYear'],
            order: [['graduationYear', 'ASC']]
        });

        const data = trends.map(t => ({
            year: t.graduationYear,
            count: parseInt(t.getDataValue('count'))
        }));

        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
