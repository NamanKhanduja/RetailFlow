const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/assistant', protect, aiController.processVoiceCommand);

module.exports = router;
