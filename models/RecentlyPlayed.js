const mongoose = require('mongoose');

const RecentlyPlayedSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Music',
    required: true,
  },
  playedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast lookup per user
RecentlyPlayedSchema.index({ user: 1, playedAt: -1 });

module.exports = mongoose.model('RecentlyPlayed', RecentlyPlayedSchema);
