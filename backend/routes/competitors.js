const express = require('express');
const router = express.Router();
const { generateCompetitorList } = require('../controllers/competitorController');

router.post('/', generateCompetitorList);

module.exports = router;
