const express = require('express');
const router = express.Router();
const { generateRevenueModel } = require('../controllers/revenueController');

router.post('/', generateRevenueModel);

module.exports = router;
