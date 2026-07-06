const express = require('express');
const router = express.Router();
const Music = require('../models/music');
const Playlist = require('../models/Playlist');
const RecentlyPlayed = require('../models/RecentlyPlayed');
const multer = require('multer');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// GET /api/music/songs — get all songs
router.get('/songs', async (req, res) => {
  try {
    const songs = await Music.find().populate('uploader', 'username').sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    console.error('GET /songs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/music/playlists — get user's playlists
router.get('/playlists', auth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ createdBy: req.user.id })
      .populate('songs');
    res.json(playlists);
  } catch (err) {
    console.error('GET /playlists error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/music/playlists — create a playlist
router.post('/playlists', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Playlist name is required' });

    const playlist = new Playlist({ name, songs: [], createdBy: req.user.id });
    await playlist.save();
    res.status(201).json(playlist);
  } catch (err) {
    console.error('POST /playlists error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/music/playlists/:id/songs — add a song to a playlist
router.put('/playlists/:id/songs', auth, async (req, res) => {
  try {
    const { songId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({ error: 'Invalid song ID' });
    }

    const playlist = await Playlist.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    if (!playlist.songs.includes(songId)) {
      playlist.songs.push(songId);
      await playlist.save();
    }

    const populated = await playlist.populate('songs');
    res.json(populated);
  } catch (err) {
    console.error('PUT /playlists/:id/songs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/music/playlists/:id — delete a playlist
router.delete('/playlists/:id', auth, async (req, res) => {
  try {
    await Playlist.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    res.json({ message: 'Playlist deleted' });
  } catch (err) {
    console.error('DELETE /playlists/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/music/recently-played — get user's recently played songs
router.get('/recently-played', auth, async (req, res) => {
  try {
    const recent = await RecentlyPlayed.find({ user: req.user.id })
      .populate('song')
      .sort({ playedAt: -1 })
      .limit(10);
    res.json(recent);
  } catch (err) {
    console.error('GET /recently-played error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/music/recently-played — record a song as played
router.post('/recently-played', auth, async (req, res) => {
  try {
    const { songId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({ error: 'Invalid song ID' });
    }

    // Upsert: update existing record or create new
    await RecentlyPlayed.findOneAndUpdate(
      { user: req.user.id, song: songId },
      { playedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ message: 'Recorded' });
  } catch (err) {
    console.error('POST /recently-played error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/music/:id — get a single song
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid song ID' });

    const song = await Music.findById(req.params.id).populate('uploader', 'username');
    if (!song) return res.status(404).json({ error: 'Song not found' });
    res.json(song);
  } catch (err) {
    console.error('GET /:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/music/upload — upload a new song (auth required)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { title, artist, genre, duration } = req.body;

    if (!req.file) return res.status(400).json({ error: 'Audio file is required' });
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!duration) return res.status(400).json({ error: 'Duration is required' });

    const newSong = new Music({
      title,
      artist: artist || 'Unknown Artist',
      genre: genre || 'Unknown',
      duration: Number(duration),
      uploader: req.user.id,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      filesize: req.file.size,
      likes: [],
    });

    await newSong.save();
    res.status(201).json(newSong);
  } catch (err) {
    console.error('POST /upload error:', err);
    res.status(400).json({ error: 'Upload failed: ' + err.message });
  }
});

// PUT /api/music/:id/like — toggle like/unlike
router.put('/:id/like', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid song ID' });

    const song = await Music.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const userId = req.user.id;
    const index = song.likes.findIndex(id => id.toString() === userId);

    if (index === -1) {
      song.likes.push(userId);
    } else {
      song.likes.splice(index, 1);
    }

    await song.save();
    res.json({ likesCount: song.likes.length, liked: index === -1 });
  } catch (err) {
    console.error('PUT /:id/like error:', err);
    res.status(500).json({ error: 'Error liking song' });
  }
});

module.exports = router;
