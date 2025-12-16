const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Like = sequelize.define('Like', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['userId', 'postId']
        }
    ]
});

module.exports = Like;
