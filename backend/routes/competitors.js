const express = require('express');
const router = express.Router();
const { generateCompetitors } = require('../controllers/competitorController');

router.post('/', generateCompetitors);

module.exports = router;
