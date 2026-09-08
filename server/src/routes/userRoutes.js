const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// GET /api/users/recipients - Authenticated users get eligible recipients list
router.get('/recipients', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.userId } })
      .select('name email role')
      .sort({ name: 1 });

    const recipients = users.map((u) => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
    }));

    return res.json(recipients);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return res.status(500).json({ error: 'Failed to fetch eligible payment recipients' });
  }
});

// GET /api/users - General authenticated users list alias
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.userId } })
      .select('name email role')
      .sort({ name: 1 });

    const recipients = users.map((u) => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
    }));

    return res.json(recipients);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users list' });
  }
});

module.exports = router;
