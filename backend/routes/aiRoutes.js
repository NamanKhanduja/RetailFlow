const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const orchestratorController = require('../controllers/orchestratorController');
const { protect } = require('../middleware/auth');

router.post('/assistant', protect, aiController.processVoiceCommand);
router.post('/orchestrator', protect, orchestratorController.processGatewayCommand);

module.exports = router;
