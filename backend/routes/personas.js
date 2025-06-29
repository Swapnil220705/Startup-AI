const express = require('express');
const router = express.Router();
const { generatePersonas } = require('../controllers/personaController');

router.post('/', generatePersonas);

module.exports = router;
