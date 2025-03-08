require('dotenv').config();
const hederaService = require('../services/hederaService');

async function initializeGame() {
    try {
        // Verify Hedera credentials
        if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
            throw new Error('Missing Hedera credentials in .env file');
        }

        console.log('Checking Hedera connection...');
        console.log('Using Account ID:', process.env.HEDERA_OPERATOR_ID);

        let gameTokenId, nftTokenId;

        // Create game token
        console.log('\nStep 1: Creating game token...');
        try {
            gameTokenId = await hederaService.createGameToken(
                'Crypto Quest Token',
                'CQT',
                1000000 // Initial supply
            );
            console.log('✓ Game token created successfully!');
            console.log('Game Token ID:', gameTokenId);
        } catch (error) {
            console.error('✗ Failed to create game token:', error.message);
            if (error.message.includes('insufficient payer balance')) {
                console.log('\nSolution: Add HBAR to your account at https://portal.hedera.com/faucet');
            }
            process.exit(1);
        }

        // Create NFT collection
        console.log('\nStep 2: Creating NFT collection...');
        try {
            nftTokenId = await hederaService.createNFT(
                'Crypto Quest NFTs',
                'CQNFT'
            );
            console.log('✓ NFT collection created successfully!');
            console.log('NFT Collection ID:', nftTokenId);
        } catch (error) {
            console.error('✗ Failed to create NFT collection:', error.message);
            console.log('\nTroubleshooting steps:');
            console.log('1. Make sure your account has sufficient HBAR');
            console.log('2. Verify your account has the necessary permissions');
            process.exit(1);
        }

        // Success output
        console.log('\n✓ Game initialization completed successfully!');
        console.log('\nAdd these values to your .env file:');
        console.log('----------------------------------');
        console.log(`GAME_TOKEN_ID=${gameTokenId}`);
        console.log(`GAME_NFT_ID=${nftTokenId}`);
        console.log('----------------------------------');

    } catch (error) {
        console.error('\n✗ Game initialization failed:', error.message);
        console.log('\nTroubleshooting steps:');
        console.log('1. Check your .env file has correct Hedera credentials');
        console.log('2. Ensure you have sufficient HBAR balance');
        console.log('3. Verify your network connection');
        console.log('\nYour .env file should contain:');
        console.log('HEDERA_OPERATOR_ID=0.0.XXXXX');
        console.log('HEDERA_OPERATOR_KEY=302e0201...');
        process.exit(1);
    }
}

// Add error handling for unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('\nUnhandled promise rejection:', error);
    process.exit(1);
});

initializeGame(); 