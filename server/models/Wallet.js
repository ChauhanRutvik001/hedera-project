const mongoose = require('mongoose');
const crypto = require('crypto');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    accountId: {
        type: String,
        required: true,
        unique: true
    },
    publicKey: {
        type: String,
        required: true
    },
    encryptedPrivateKey: {
        type: String,
        required: true
    },
    tokenBalance: {
        type: Number,
        default: 0
    },
    nfts: [{
        tokenId: String,
        serialNumber: Number,
        name: String,
        description: String,
        timestamp: Date
    }],
    isAssociated: {
        type: Boolean,
        default: false
    },
    connectedAt: {
        type: Date,
        default: Date.now
    }
});

// Encrypt private key before saving
walletSchema.methods.setPrivateKey = function(privateKey) {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.WALLET_ENCRYPTION_KEY || 'your-encryption-key');
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    this.encryptedPrivateKey = encrypted;
};

// Decrypt private key
walletSchema.methods.getPrivateKey = function() {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.WALLET_ENCRYPTION_KEY || 'your-encryption-key');
    let decrypted = decipher.update(this.encryptedPrivateKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

module.exports = mongoose.model('Wallet', walletSchema); 