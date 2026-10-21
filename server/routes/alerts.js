const express = require('express');
const AlertLog = require('../models/AlertLog');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const alerts = await AlertLog.find().populate('transactionId').sort({ timestamp: -1 }).limit(50);
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
