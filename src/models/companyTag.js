const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const CompanyTag = sequelize.define('CompanyTag', {
  companyId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'Companies',
      key: 'id'
    }
  },
  tagId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'Tags',
      key: 'id'
    }
  }
});

module.exports = CompanyTag;
