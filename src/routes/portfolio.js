const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Portfolio } = require('../models/associations');

// GET /api/portfolio/me
router.get('/me', auth, async (req, res) => {
    try {
        const items = await Portfolio.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/portfolio
router.post('/', auth, async (req, res) => {
    const { title, type, role, url, iframeUrl, description, imageUrl } = req.body;
    try {
        const newItem = await Portfolio.create({
            userId: req.user.id,
            title,
            type,
            role,
            url,
            iframeUrl,
            description,
            imageUrl
        });
        res.json(newItem);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// PUT /api/portfolio/:id
router.put('/:id', auth, async (req, res) => {
    const { title, type, role, url, iframeUrl, description, imageUrl } = req.body;
    try {
        let item = await Portfolio.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!item) {
            return res.status(404).json({ msg: 'Item not found' });
        }

        item.title = title || item.title;
        item.type = type || item.type;
        item.role = role !== undefined ? role : item.role;
        item.url = url !== undefined ? url : item.url;
        item.iframeUrl = iframeUrl !== undefined ? iframeUrl : item.iframeUrl;
        item.description = description !== undefined ? description : item.description;
        item.imageUrl = imageUrl !== undefined ? imageUrl : item.imageUrl;

        await item.save();
        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/portfolio/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const item = await Portfolio.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!item) {
            return res.status(404).json({ msg: 'Item not found' });
        }
        await item.destroy();
        res.json({ msg: 'Item removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
