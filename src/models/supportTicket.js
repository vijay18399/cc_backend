const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const SupportTicket = sequelize.define('SupportTicket', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    collegeId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('BUG', 'FEATURE_REQUEST'),
        defaultValue: 'BUG',
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'VALIDATED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'REJECTED', 'CLOSED'),
        defaultValue: 'OPEN',
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        defaultValue: 'MEDIUM',
    }
}, {
    tableName: 'support_tickets',
    timestamps: true,
});

module.exports = SupportTicket;
