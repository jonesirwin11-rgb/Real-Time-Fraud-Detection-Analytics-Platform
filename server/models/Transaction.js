const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  cardId: { type: String, required: true },
  amount: { type: Number, required: true },
  location: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  riskScore: { type: Number, default: 0 },
  flagged: { type: Boolean, default: false },
  rulesTriggered: [String]
});

module.exports = mongoose.model('Transaction', transactionSchema);
