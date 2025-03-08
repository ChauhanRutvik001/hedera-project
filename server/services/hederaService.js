require('dotenv').config();

const { 
    Client, 
    AccountId, 
    PrivateKey, 
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
    TransferTransaction,
    Hbar,
    TokenAssociateTransaction
} = require('@hashgraph/sdk');

class HederaService {
    constructor() {
        console.log('Initializing HederaService...');
        
        // Initialize Hedera client for testnet
        this.client = Client.forTestnet();

        // Set up operator (treasury) account
        if (process.env.HEDERA_OPERATOR_ID && process.env.HEDERA_OPERATOR_KEY) {
            console.log('Found Hedera credentials in env');
            this.operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
            this.operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY);
            this.client.setOperator(this.operatorId, this.operatorKey);
            console.log('Hedera operator configured:', this.operatorId.toString());
        } else {
            console.error('Missing Hedera credentials in env variables');
        }

        // Game token IDs - Convert to AccountId objects
        console.log('Configuring game tokens...');
        console.log('GAME_TOKEN_ID from env:', process.env.GAME_TOKEN_ID);
        
        if (process.env.GAME_TOKEN_ID) {
            try {
                this.gameTokenId = AccountId.fromString(process.env.GAME_TOKEN_ID);
                console.log('Game Token ID successfully configured:', this.gameTokenId.toString());
            } catch (error) {
                console.error('Failed to parse Game Token ID:', error);
                this.gameTokenId = null;
            }
        } else {
            console.error('Game Token ID not found in environment variables');
            this.gameTokenId = null;
        }

        if (process.env.GAME_NFT_ID) {
            try {
                this.gameNftId = AccountId.fromString(process.env.GAME_NFT_ID);
                console.log('Game NFT ID successfully configured:', this.gameNftId.toString());
            } catch (error) {
                console.error('Failed to parse Game NFT ID:', error);
                this.gameNftId = null;
            }
        } else {
            console.error('Game NFT ID not found in environment variables');
            this.gameNftId = null;
        }
    }

    async createGameToken(name, symbol, initialSupply) {
        try {
            const transaction = await new TokenCreateTransaction()
                .setTokenName(name)
                .setTokenSymbol(symbol)
                .setTokenType(TokenType.FungibleCommon)
                .setDecimals(0)
                .setInitialSupply(initialSupply)
                .setTreasuryAccountId(this.operatorId)
                .setSupplyType(TokenSupplyType.Infinite)
                .setSupplyKey(this.operatorKey)
                .setAdminKey(this.operatorKey)
                .setFreezeKey(this.operatorKey)
                .setWipeKey(this.operatorKey)
                .setMaxTransactionFee(new Hbar(100))
                .freezeWith(this.client);

            const response = await transaction.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            return receipt.tokenId.toString();
        } catch (error) {
            console.error("Error creating game token:", error);
            throw error;
        }
    }

    async createNFT(name, symbol) {
        try {
            const transaction = await new TokenCreateTransaction()
                .setTokenName(name)
                .setTokenSymbol(symbol)
                .setTokenType(TokenType.NonFungibleUnique)
                .setSupplyType(TokenSupplyType.Finite)
                .setMaxSupply(1000)
                .setTreasuryAccountId(this.operatorId)
                .setSupplyKey(this.operatorKey)
                .setAdminKey(this.operatorKey)
                .setFreezeKey(this.operatorKey)
                .setWipeKey(this.operatorKey)
                .setMaxTransactionFee(new Hbar(100))
                .freezeWith(this.client);

            const response = await transaction.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            return receipt.tokenId.toString();
        } catch (error) {
            if (error.message?.includes('TOKEN_HAS_NO_SUPPLY_KEY')) {
                throw new Error('Failed to create NFT: Missing supply key configuration');
            }
            console.error("Error creating NFT:", error);
            throw error;
        }
    }

    async associateTokenToAccount(accountId, privateKey, tokenId) {
        try {
            console.log('Associating token:', tokenId, 'to account:', accountId);
            
            const account = AccountId.fromString(accountId);
            const key = PrivateKey.fromString(privateKey);
            const token = AccountId.fromString(tokenId);

            // Create client for user
            const userClient = Client.forTestnet();
            userClient.setOperator(account, key);

            // Associate token
            const transaction = await new TokenAssociateTransaction()
                .setAccountId(account)
                .setTokenIds([token])
                .setMaxTransactionFee(new Hbar(2))
                .freezeWith(userClient);

            const response = await transaction.execute(userClient);
            const receipt = await response.getReceipt(userClient);
            console.log('Token association successful for:', tokenId);
            return receipt;
        } catch (error) {
            console.error("Error associating token:", error);
            throw error;
        }
    }

    async mintNFT(metadata) {
        try {
            if (!this.gameNftId) {
                throw new Error('NFT collection ID not configured');
            }

            const transaction = await new TokenMintTransaction()
                .setTokenId(this.gameNftId)
                .setMetadata([Buffer.from(JSON.stringify(metadata))])
                .freezeWith(this.client);

            const response = await transaction.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            return receipt;
        } catch (error) {
            console.error("Error minting NFT:", error);
            throw error;
        }
    }

    async transferTokens(receiverId, amount) {
        try {
            console.log('Transfer attempt - Current gameTokenId:', this.gameTokenId);
            console.log('Transfer details - Receiver:', receiverId, 'Amount:', amount);
            
            if (!this.gameTokenId) {
                console.error('Game token ID is null. Current env value:', process.env.GAME_TOKEN_ID);
                throw new Error('Game token ID not configured. Check GAME_TOKEN_ID in .env file');
            }

            console.log('Transferring tokens:', amount, 'to account:', receiverId);
            
            const transaction = await new TransferTransaction()
                .addTokenTransfer(this.gameTokenId, this.operatorId, -amount)
                .addTokenTransfer(this.gameTokenId, AccountId.fromString(receiverId), amount)
                .setMaxTransactionFee(new Hbar(2))
                .freezeWith(this.client);

            const response = await transaction.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            console.log('Token transfer successful');
            return receipt;
        } catch (error) {
            console.error("Error transferring tokens:", error);
            throw error;
        }
    }

    // Verify if an account exists on Hedera
    async verifyAccount(accountId) {
        try {
            const account = AccountId.fromString(accountId);
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new HederaService(); 