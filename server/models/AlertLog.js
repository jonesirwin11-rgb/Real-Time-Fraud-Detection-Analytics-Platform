const mongoose = require('mongoose');

const alertLogSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  ruleTriggered: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AlertLog', alertLogSchema);
