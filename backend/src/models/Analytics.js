const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  totalTrains: {
    type: Number,
    default: 0
  },
  delayedTrains: {
    type: Number,
    default: 0
  },
  onTimeRate: {
    type: Number,
    default: 100 // Percentage
  },
  avgDelay: {
    type: Number,
    default: 0 // Minutes
  },
  platformUsage: {
    type: Number,
    default: 0 // Percentage
  },
  incidents: {
    type: Number,
    default: 0
  },
  predictionResults: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // For storing overall system predictions, traffic forecasts, etc.
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Analytics', analyticsSchema);
