const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema({
  platformNumber: {
    type: String,
    required: true,
    unique: true
  },
  stationName: {
    type: String,
    required: true
  },
  occupied: {
    type: Boolean,
    default: false
  },
  assignedTrain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Train',
    default: null
  },
  nextArrival: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'closed'],
    default: 'active'
  },
  aiMetadata: {
    demandForecasts: {
      type: Number, // Expected passenger demand/crowd density
      default: 0
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Platform', platformSchema);
