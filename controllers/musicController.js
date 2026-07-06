const Music = require('../models/music');
const Playlist = require('../models/Playlist');

exports.getPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({ createdBy: req.user.id }).populate('songs');
    res.json(playlists);
  } catch (err) {
    console.error('getPlaylists error:', err);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
};

exports.getAllSongs = async (req, res) => {
  try {
    const songs = await Music.find().populate('uploader', 'username').sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    console.error('getAllSongs error:', err);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
};
