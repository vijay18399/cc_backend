const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const TicketComment = sequelize.define('TicketComment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    ticketId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    tableName: 'ticket_comments',
    timestamps: true,
});

module.exports = TicketComment;
