const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { SupportTicket, User, TicketComment, Profile } = require('../models/associations');

// @route   POST /api/support
// @desc    Create a new support ticket
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, type, priority } = req.body;

        const ticket = await SupportTicket.create({
            userId: req.user.id,
            collegeId: req.user.collegeId,
            title,
            description,
            type,
            priority,
        });

        res.json(ticket);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/support
// @desc    Get all support tickets (filtered based on role)
// @access  Private (Admin/SuperAdmin)
router.get('/', auth, async (req, res) => {
    try {
        const whereClause = {};

        // If STUDENT or ALUMNI, only see own tickets
        if (req.user.role === 'STUDENT' || req.user.role === 'ALUMNI') {
            whereClause.userId = req.user.id;
        } else if (req.user.role !== 'SUPER_ADMIN') {
            // ADMIN sees college tickets
            whereClause.collegeId = req.user.collegeId;
        }

        const tickets = await SupportTicket.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['username', 'id', 'role'], // Include role to see student/alumni
                    include: [{ model: Profile, attributes: ['fullName', 'profilePictureUrl'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(tickets);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/support/:id/status
// @desc    Update ticket status
// @access  Private (Admin/SuperAdmin)
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await SupportTicket.findByPk(req.params.id);

        if (!ticket) {
            return res.status(404).json({ msg: 'Ticket not found' });
        }

        // Authorization check (optional stricter check: only own college for regular admin)
        if (req.user.role !== 'SUPER_ADMIN' && ticket.collegeId !== req.user.collegeId) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        ticket.status = status;
        await ticket.save();

        res.json(ticket);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/support/:id/comments
// @desc    Add a comment to a ticket
// @access  Private
router.post('/:id/comments', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const ticket = await SupportTicket.findByPk(req.params.id);

        if (!ticket) {
            return res.status(404).json({ msg: 'Ticket not found' });
        }

        const comment = await TicketComment.create({
            ticketId: ticket.id,
            userId: req.user.id,
            content
        });

        const fullComment = await TicketComment.findByPk(comment.id, {
            include: [{
                model: User,
                attributes: ['username', 'role'],
                include: [{ model: Profile, attributes: ['fullName'] }]
            }]
        });

        res.json(fullComment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/support/:id/comments
// @desc    Get comments for a ticket
// @access  Private
router.get('/:id/comments', auth, async (req, res) => {
    try {
        const comments = await TicketComment.findAll({
            where: { ticketId: req.params.id },
            include: [{
                model: User,
                attributes: ['username', 'role'],
                include: [{ model: Profile, attributes: ['fullName'] }]
            }],
            order: [['createdAt', 'ASC']]
        });

        res.json(comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
