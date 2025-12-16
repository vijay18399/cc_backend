const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    mediaUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mediaType: {
        type: DataTypes.ENUM('IMAGE', 'VIDEO', 'NONE'),
        defaultValue: 'NONE'
    },
    category: {
        type: DataTypes.ENUM('GENERAL', 'EVENT', 'ALUMNI_UPDATE', 'ANNOUNCEMENT', 'ACHIEVEMENT', 'CAREER_UPDATE'),
        defaultValue: 'GENERAL'
    },
    scope: {
        type: DataTypes.ENUM('COLLEGE', 'PUBLIC'),
        defaultValue: 'COLLEGE'
    },
    likesCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    commentsCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    eventStartDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    eventEndDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    achievementType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    gamificationPoints: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    careerType: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = Post;
