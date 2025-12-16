const express = require('express');
const router = express.Router();
const analyzeSearchQuery = require('../utility/RAG');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { User, Profile, Skill, Experience, Company } = require('../models/associations');

// @route   POST /api/search/analyze
// @desc    Analyze a natural language search query
// @access  Private
router.post('/analyze', auth, async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ msg: 'Query is required' });
    }

    try {
        // 1. Analyze the query using RAG
        const analysis = await analyzeSearchQuery(query);
        console.log("Analysis:", analysis);

        // 2. Build the database query
        const whereClause = {};
        const includeClause = [
            {
                model: Profile,
                attributes: ['fullName', 'bio', 'department', 'graduationYear', 'profilePictureUrl']
            }
        ];

        // Filter by User Type (Student/Alumni)
        if (analysis.userType) {
            whereClause.role = analysis.userType.toUpperCase();
        }

        // Filter by Name, Year, Dept, Section (if present)
        const profileWhere = {};
        if (analysis.name) {
            profileWhere.fullName = { [Op.like]: `%${analysis.name}%` };
        }
        if (analysis.graduationYear && analysis.graduationYear.length > 0) {
            profileWhere.graduationYear = { [Op.in]: analysis.graduationYear };
        }
        if (analysis.department && analysis.department.length > 0) {
            profileWhere.department = { [Op.in]: analysis.department };
        }
        if (analysis.section) {
            profileWhere.section = analysis.section;
        }

        if (Object.keys(profileWhere).length > 0) {
            includeClause[0].where = profileWhere;
        }

        // Handle Skills
        const skillInclude = {
            model: Skill,
            through: { attributes: [] }
        };
        if (analysis.skills && analysis.skills.length > 0) {
            skillInclude.where = {
                name: { [Op.in]: analysis.skills }
            };
        }
        includeClause.push(skillInclude);

        // Handle Companies/Experience
        const experienceInclude = {
            model: Experience,
            include: [{
                model: Company
            }]
        };

        if (analysis.companies && analysis.companies.length > 0) {
            experienceInclude.required = true; // Only return users with this experience
            experienceInclude.include[0].where = {
                name: { [Op.in]: analysis.companies }
            };
        }
        includeClause.push(experienceInclude);

        // 3. Execute the search
        const users = await User.findAll({
            where: whereClause,
            include: includeClause,
            attributes: ['id', 'username', 'email', 'role']
        });

        // 4. Return combined response
        res.json({
            filters: analysis,
            results: users
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
