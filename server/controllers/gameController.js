const Game = require('../models/Game');
const Wallet = require('../models/Wallet');
const hederaService = require('../services/hederaService');

// Connect wallet
exports.connectWallet = async (req, res) => {
    try {
        const { accountId, publicKey, privateKey } = req.body;
        const userId = req.user._id;

        // Verify if account exists on Hedera
        const isValidAccount = await hederaService.verifyAccount(accountId);
        if (!isValidAccount) {
            return res.status(400).json({ message: 'Invalid Hedera account' });
        }

        let wallet = await Wallet.findOne({ userId });
        if (wallet) {
            return res.status(400).json({ message: 'Wallet already connected' });
        }

        // Create new wallet
        wallet = new Wallet({
            userId,
            accountId,
            publicKey
        });

        // Encrypt and store private key
        wallet.setPrivateKey(privateKey);

        // Associate account with game token if not already associated
        if (!wallet.isAssociated) {
            try {
                await hederaService.associateTokenToAccount(
                    accountId,
                    privateKey,
                    hederaService.gameTokenId
                );
                wallet.isAssociated = true;
            } catch (error) {
                console.error("Token association error:", error);
                // Continue even if association fails - might be already associated
            }
        }

        await wallet.save();

        res.status(201).json({
            message: 'Wallet connected successfully',
            wallet: {
                accountId: wallet.accountId,
                publicKey: wallet.publicKey,
                isAssociated: wallet.isAssociated
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error connecting wallet',
            error: error.message
        });
    }
};

// Complete challenge and earn reward
exports.completeChallenge = async (req, res) => {
    try {
        const { challengeType, challengeName } = req.body;
        const userId = req.user._id;

        // Verify wallet connection
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(400).json({ message: 'Please connect your wallet first' });
        }

        // Get or create game profile
        let game = await Game.findOne({ userId });
        if (!game) {
            game = new Game({ userId });
        }

        // Verify challenge hasn't been completed today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const alreadyCompleted = game.achievements.some(achievement => 
            achievement.type === challengeType &&
            achievement.completedAt >= today
        );

        if (alreadyCompleted) {
            return res.status(400).json({ message: 'Challenge already completed today' });
        }

        // Determine reward
        let reward;
        switch (challengeType) {
            case 'DAILY_CHALLENGE':
                reward = { type: 'TOKEN', amount: 10 };
                break;
            case 'WEEKLY_CHALLENGE':
                reward = { type: 'TOKEN', amount: 50 };
                break;
            case 'SPECIAL_EVENT':
                reward = { type: 'NFT', metadata: { name: challengeName, type: 'Achievement' } };
                break;
            default:
                return res.status(400).json({ message: 'Invalid challenge type' });
        }

        // Process reward
        if (reward.type === 'TOKEN') {
            await hederaService.transferTokens(wallet.accountId, reward.amount);
            game.tokenBalance += reward.amount;
        } else if (reward.type === 'NFT') {
            const nftReceipt = await hederaService.mintNFT(reward.metadata);
            wallet.nfts.push({
                tokenId: nftReceipt.tokenId.toString(),
                serialNumber: nftReceipt.serialNumber,
                name: reward.metadata.name,
                timestamp: new Date()
            });
        }

        // Record achievement
        game.achievements.push({
            type: challengeType,
            name: challengeName,
            rewardType: reward.type,
            rewardAmount: reward.type === 'TOKEN' ? reward.amount : null,
            completedAt: new Date()
        });

        // Update streak
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (game.streak.lastUpdated >= yesterday) {
            game.streak.count += 1;
        } else {
            game.streak.count = 1;
        }
        game.streak.lastUpdated = new Date();

        await game.save();
        await wallet.save();

        res.json({
            message: 'Challenge completed successfully',
            reward,
            game
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error completing challenge',
            error: error.message
        });
    }
};

// Get game profile
exports.getGameProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const game = await Game.findOne({ userId });
        const wallet = await Wallet.findOne({ userId });

        if (!game || !wallet) {
            return res.status(404).json({ message: 'Game profile not found' });
        }

        res.json({
            game,
            wallet: {
                accountId: wallet.accountId,
                tokenBalance: wallet.tokenBalance,
                nfts: wallet.nfts,
                isAssociated: wallet.isAssociated
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching game profile',
            error: error.message
        });
    }
}; 