const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  artist: {
    type: String,
    trim: true,
    default: 'Unknown Artist',
    index: true,
  },
  genre: {
    type: String,
    trim: true,
    default: 'Unknown',
  },
  duration: {
    type: Number, // duration in seconds
    required: true,
    min: 1,
  },
  filename: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  filesize: {
    type: Number, // size in bytes
    required: true,
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true, // adds createdAt and updatedAt fields automatically
});

// Virtual for like count
musicSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Method to check if a user liked the song
musicSchema.methods.isLikedBy = function(userId) {
  return this.likes.includes(userId);
};

// Optional: text index for better search on title and artist
musicSchema.index({ title: 'text', artist: 'text' });

module.exports = mongoose.model('Music', musicSchema);
