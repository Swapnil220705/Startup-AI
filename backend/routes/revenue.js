const express = require('express');
const router = express.Router();
const { generateRevenue } = require('../controllers/revenueController');

router.post('/', generateRevenue);

module.exports = router;
