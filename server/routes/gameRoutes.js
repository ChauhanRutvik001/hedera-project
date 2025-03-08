const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Wallet routes
router.post('/wallet/connect', gameController.connectWallet);

// Game routes
router.post('/challenge/complete', gameController.completeChallenge);
router.get('/profile', gameController.getGameProfile);

module.exports = router; 