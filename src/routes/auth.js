const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, College } = require('../models/associations');
const { Op } = require('sequelize');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { login, password, collegeSubdomain } = req.body; // login can be username or email

  try {
    let user;
    const whereClause = {
      [Op.or]: [{ email: login }, { username: login }],
    };

    // If collegeSubdomain is provided, scope the user search to that college
    if (collegeSubdomain) {
      const college = await College.findOne({ where: { subdomain: collegeSubdomain } });
      if (!college) {
        return res.status(404).json({ error: 'College not found.' });
      }
      whereClause.collegeId = college.id;
    } else {
      // If no subdomain, it's likely a Super Admin login
      whereClause.role = 'SUPER_ADMIN';
    }

    user = await User.findOne({ where: whereClause });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      collegeId: user.collegeId,
    };

    // Generate Access Token (Short-lived: 15 minutes)
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generate Refresh Token (Long-lived: 30 days)
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Save Refresh Token to DB
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      token: accessToken, // Alias for compatibility
      accessToken,
      refreshToken,
      user: payload
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// POST /api/auth/refresh-token
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ msg: 'No refresh token, authorization denied' });
  }

  try {
    // Verify Refresh Token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Find user and check if refresh token matches
    const user = await User.findOne({ where: { id: decoded.id } });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ msg: 'Invalid refresh token' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      collegeId: user.collegeId,
    };

    // Generate New Access Token
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });

  } catch (err) {
    console.error(err);
    res.status(403).json({ msg: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.sendStatus(204);

  try {
    const user = await User.findOne({ where: { refreshToken } });
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


// POST /api/auth/recover-password
router.post('/recover-password', async (req, res) => {
  const { rollNumber, collegeSubdomain, newPassword, dob } = req.body;

  try {
    const college = await College.findOne({ where: { subdomain: collegeSubdomain } });
    if (!college) {
      return res.status(404).json({ error: 'College not found.' });
    }

    const user = await User.findOne({ where: { username: rollNumber, collegeId: college.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found in this college.' });
    }

    if (user.dob !== dob) {
      return res.status(400).json({ error: 'Invalid Date of Birth.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });

  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
