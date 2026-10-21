const express = require('express');
const Transaction = require('../models/Transaction');
const AlertLog = require('../models/AlertLog');

module.exports = (io) => {
  const router = express.Router();

  // POST /api/transactions
  router.post('/', async (req, res, next) => {
    try {
      const { cardId, amount, location } = req.body;
      if (!cardId || amount == null || !location) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const now = new Date();
      let flagged = false;
      let riskScore = 0;
      let rulesTriggered = [];

      // 1. Velocity rule: >3 transactions in last 1 minute
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const recentTx = await Transaction.find({ cardId, timestamp: { $gte: oneMinuteAgo } }).sort({ timestamp: -1 });
      
      if (recentTx.length >= 3) {
        flagged = true;
        riskScore += 50;
        rulesTriggered.push("Velocity Rule");
      }

      // 2. Location rule
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const prevTx = await Transaction.findOne({ cardId, timestamp: { $gte: fiveMinutesAgo } }).sort({ timestamp: -1 });

      if (prevTx && prevTx.location !== location) {
        flagged = true;
        riskScore += 50;
        rulesTriggered.push("Location Rule");
      }

      const transaction = new Transaction({ cardId, amount, location, timestamp: now, riskScore, flagged, rulesTriggered });
      await transaction.save();

      if (flagged) {
        for (const rule of rulesTriggered) {
          const alert = new AlertLog({ transactionId: transaction._id, ruleTriggered: rule, timestamp: now });
          await alert.save();
        }
        io.emit('fraudAlert', { transaction, rulesTriggered });
      }

      io.emit('newTransaction', transaction);

      res.status(201).json(transaction);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/transactions/stats
  router.get('/stats', async (req, res, next) => {
    try {
      const total = await Transaction.countDocuments();
      const flagged = await Transaction.countDocuments({ flagged: true });
      res.json({ total, flagged });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/transactions
  router.get('/', async (req, res, next) => {
    try {
      const transactions = await Transaction.find().sort({ timestamp: -1 }).limit(50);
      res.json(transactions);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
