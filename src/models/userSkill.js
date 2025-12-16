const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const UserSkill = sequelize.define('UserSkill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  skillId: {
    type: DataTypes.UUID,
    references: {
      model: 'Skills',
      key: 'id'
    }
  }
});

module.exports = UserSkill;
