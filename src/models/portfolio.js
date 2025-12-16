const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Portfolio = sequelize.define('Portfolio', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('PROJECT', 'PUBLICATION', 'PRODUCT', 'MEDIA', 'DESIGN', 'ACHIEVEMENT', 'OTHER'),
        allowNull: false,
        defaultValue: 'OTHER'
    },
    role: {
        type: DataTypes.STRING, // e.g., Author, Director, Developer, Actor
        allowNull: true
    },
    url: {
        type: DataTypes.STRING, // Link to the resource
        allowNull: true
    },
    iframeUrl: {
        type: DataTypes.TEXT, // Embed URL for games/apps
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = Portfolio;
