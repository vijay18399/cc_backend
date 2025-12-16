const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { Skill } = require('../models/associations');

// GET /api/skills/search
// Search for skills by name (for autocomplete)
router.get('/search', auth, async (req, res) => {
    const { query } = req.query;
    try {
        const skills = await Skill.findAll({
            where: {
                name: { [Op.like]: `%${query}%` }
            },
            limit: 10,
            attributes: ['id', 'name']
        });
        res.json(skills);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
