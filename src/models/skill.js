const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Skill = sequelize.define('Skill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  category: {
    type: DataTypes.STRING, // e.g., "Frontend", "Backend", "Soft Skill"
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isTechnical: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  iconUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = Skill;
