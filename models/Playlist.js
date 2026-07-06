const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  cover: {
    type: String,
    default: '', // optional cover image URL
  },
  songs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Music',  // reference to your Music collection
    required: true,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Playlist', playlistSchema);
