const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  assetType: {
    type: String,
    enum: ['Train', 'Platform', 'Track', 'Signal', 'System'],
    required: true
  },
  assetId: {
    type: String,
    required: true
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  nextServiceDate: {
    type: Date,
    required: true
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'overdue'],
    default: 'scheduled'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);
