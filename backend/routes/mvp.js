const express = require('express');
const router = express.Router();
const { generateMVP } = require('../controllers/mvpController');

router.post('/', generateMVP);

module.exports = router;
