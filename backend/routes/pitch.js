const express = require('express');
const router = express.Router();
const { generatePitchDeck } = require('../controllers/pitchController');

router.post('/', generatePitchDeck);

module.exports = router;
