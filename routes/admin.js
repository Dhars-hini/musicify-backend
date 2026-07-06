const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Music = require('../models/music');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// ── Middleware ─────────────────────────────────────────────────────────────────
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// ── Stats ──────────────────────────────────────────────────────────────────────
// GET /api/admin/stats
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const [totalUsers, totalSongs, genreAgg] = await Promise.all([
      User.countDocuments(),
      Music.countDocuments(),
      Music.aggregate([
        { $group: { _id: '$genre', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    res.json({
      summary: [
        { label: 'Total Users', value: totalUsers },
        { label: 'Total Songs', value: totalSongs },
      ],
      genreBreakdown: genreAgg.map(g => ({ genre: g._id || 'Unknown', count: g.count })),
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Users ──────────────────────────────────────────────────────────────────────
// GET /api/admin/users
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const { search, role } = req.query;
    const filter = {};
    if (role && ['user', 'admin'].includes(role)) filter.role = role;
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete another admin account' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/users/:id/role  — toggle between user ↔ admin
router.patch('/users/:id/role', auth, isAdmin, async (req, res) => {
  try {
    // Prevent self-demotion
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();
    res.json({ message: `Role updated to ${user.role}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Songs ──────────────────────────────────────────────────────────────────────
// GET /api/admin/songs
router.get('/songs', auth, isAdmin, async (req, res) => {
  try {
    const { search, genre } = req.query;
    const filter = {};
    if (genre) filter.genre = { $regex: genre, $options: 'i' };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
      ];
    }
    const songs = await Music.find(filter)
      .populate('uploader', 'username email')
      .sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/songs/:id
router.delete('/songs/:id', auth, isAdmin, async (req, res) => {
  try {
    const song = await Music.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'Song not found' });

    // Remove the physical file from disk
    const filePath = path.join(__dirname, '..', 'uploads', song.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Music.findByIdAndDelete(req.params.id);
    res.json({ message: 'Song deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
