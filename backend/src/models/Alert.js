const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['delay', 'maintenance', 'security', 'system', 'weather']
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedTrain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Train',
    default: null
  },
  relatedPlatform: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    default: null
  },
  resolved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

alertSchema.index({ resolved: 1, severity: 1 });

module.exports = mongoose.model('Alert', alertSchema);
