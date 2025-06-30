const express = require('express');
const router = express.Router();
const { generatePitch } = require('../controllers/pitchController');

router.post('/', generatePitch);

module.exports = router;

