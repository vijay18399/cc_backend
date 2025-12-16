const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Post, User, Profile, Like, Comment } = require('../models/associations');
const sequelize = require('../database');

// GET /api/posts
// Get feed
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, category } = req.query;
        const offset = (page - 1) * limit;
        const whereClause = { collegeId: req.user.collegeId };

        if (category && category !== 'ALL') {
            whereClause.category = category;
        }

        const posts = await Post.findAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User,
                    attributes: ['id', 'username', 'role'],
                    include: [{ model: Profile, attributes: ['fullName', 'profilePictureUrl', 'headline'] }]
                }
            ]
        });

        // Check isLiked for each post
        // We can do this efficiently by fetching all Likes for these posts by this user
        const postIds = posts.map(p => p.id);
        const userLikes = await Like.findAll({
            where: {
                userId: req.user.id,
                postId: postIds
            },
            attributes: ['postId']
        });

        const likedPostIds = new Set(userLikes.map(l => l.postId));

        const formattedPosts = posts.map(post => {
            const p = post.toJSON();
            p.isLiked = likedPostIds.has(p.id);
            return p;
        });

        res.json(formattedPosts);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// GET /api/posts/:id
// Get single post
router.get('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'username', 'role'],
                    include: [{ model: Profile, attributes: ['fullName', 'profilePictureUrl', 'headline'] }]
                }
            ]
        });

        if (!post) return res.status(404).json({ msg: 'Post not found' });

        // Check isLiked
        const like = await Like.findOne({
            where: {
                userId: req.user.id,
                postId: post.id
            }
        });

        const p = post.toJSON();
        p.isLiked = !!like;

        res.json(p);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/posts
// Create post
router.post('/', auth, async (req, res) => {
    try {
        const { content, mediaUrl, mediaType, category, eventStartDate, eventEndDate, achievementType, gamificationPoints, careerType } = req.body;

        if (!content && !mediaUrl) {
            return res.status(400).json({ msg: 'Post must have content or media' });
        }

        const post = await Post.create({
            userId: req.user.id,
            collegeId: req.user.collegeId,
            content,
            mediaUrl,
            mediaType: mediaType || 'NONE',
            category: category || 'GENERAL',
            eventStartDate,
            eventEndDate,
            achievementType,
            gamificationPoints,
            careerType
        });

        const fullPost = await Post.findByPk(post.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'username', 'role'],
                    include: [{ model: Profile, attributes: ['fullName', 'profilePictureUrl', 'headline'] }]
                }
            ]
        });

        const p = fullPost.toJSON();
        p.isLiked = false;

        res.json(p);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/posts/:id/like
// Toggle like
router.post('/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });

        const existingLike = await Like.findOne({
            where: { userId: req.user.id, postId: post.id }
        });

        if (existingLike) {
            await existingLike.destroy();
            await post.decrement('likesCount');
            return res.json({ isLiked: false, likesCount: post.likesCount - 1 });
        } else {
            await Like.create({ userId: req.user.id, postId: post.id });
            await post.increment('likesCount');
            return res.json({ isLiked: true, likesCount: post.likesCount + 1 });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// GET /api/posts/:id/comments
// Get comments
router.get('/:id/comments', auth, async (req, res) => {
    try {
        const comments = await Comment.findAll({
            where: { postId: req.params.id },
            order: [['createdAt', 'ASC']],
            include: [
                {
                    model: User,
                    attributes: ['id', 'username'],
                    include: [{ model: Profile, attributes: ['fullName', 'profilePictureUrl'] }]
                }
            ]
        });
        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/posts/:id/comments
// Add comment
router.post('/:id/comments', auth, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ msg: 'Content required' });

        const post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });

        const comment = await Comment.create({
            userId: req.user.id,
            postId: post.id,
            content
        });

        await post.increment('commentsCount');

        const fullComment = await Comment.findByPk(comment.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'username'],
                    include: [{ model: Profile, attributes: ['fullName', 'profilePictureUrl'] }]
                }
            ]
        });

        res.json(fullComment);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/posts/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });

        if (post.userId !== req.user.id && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COLLEGE_ADMIN') {
            return res.status(401).json({ msg: 'Unauthorized' });
        }

        await post.destroy();
        res.json({ msg: 'Post deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
