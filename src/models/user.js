const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  collegeId: {
    type: DataTypes.UUID,
    allowNull: true, // Null for Super Admins
    references: { // Corrected: This links to the College model
      model: 'Colleges', // Table name
      key: 'id'          // Primary key of the College model
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, // Made optional
    unique: true // Globally unique for user persona
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  username: { // This will effectively be the rollNumber for students, unique per college
    type: DataTypes.STRING,
    allowNull: false
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('STUDENT', 'ALUMNI', 'FACULTY', 'COLLEGE_ADMIN', 'SUPER_ADMIN'),
    allowNull: false
  },
  refreshToken: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = User;
