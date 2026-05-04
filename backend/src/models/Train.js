const mongoose = require('mongoose');

const trainSchema = new mongoose.Schema({
  trainNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  trainName: {
    type: String,
    required: true,
    trim: true
  },
  route: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  currentLocation: {
    type: String,
    default: 'Origin'
  },
  speed: {
    type: Number,
    default: 0
  },
  eta: {
    type: Date
  },
  delayMinutes: {
    type: Number,
    default: 0
  },
  assignedPlatform: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform'
  },
  status: {
    type: String,
    enum: ['running', 'delayed', 'arrived', 'cancelled', 'scheduled'],
    default: 'scheduled'
  },
  aiMetadata: {
    delayPredictions: {
      type: Number, // Predicted delay in minutes
      default: 0
    },
    riskScores: {
      type: Number, // 0 to 100 risk score of incident/delay
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexing for search performance
trainSchema.index({ trainNumber: 1 });
trainSchema.index({ status: 1 });

module.exports = mongoose.model('Train', trainSchema);
