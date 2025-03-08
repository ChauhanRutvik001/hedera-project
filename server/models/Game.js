const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    achievements: [{
        type: {
            type: String,
            enum: ['DAILY_CHALLENGE', 'WEEKLY_CHALLENGE', 'SPECIAL_EVENT'],
            required: true
        },
        name: String,
        description: String,
        rewardType: {
            type: String,
            enum: ['TOKEN', 'NFT'],
            required: true
        },
        rewardAmount: Number,
        completedAt: Date
    }],
    tokenBalance: {
        type: Number,
        default: 0
    },
    lastPlayedAt: {
        type: Date,
        default: Date.now
    },
    streak: {
        count: {
            type: Number,
            default: 0
        },
        lastUpdated: Date
    }
});

module.exports = mongoose.model('Game', gameSchema); 