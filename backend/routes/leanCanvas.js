const express = require('express');
const router = express.Router();
const { generateLeanCanvas } = require('../controllers/leanCanvasController');

router.post('/', generateLeanCanvas);

module.exports = router;
