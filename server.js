const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, createTransferInstruction } = require('@solana/spl-token');
const Buffer = require('buffer').Buffer;

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Log requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// Create transaction for transferring USDT
app.post('/create-transaction', async (req, res) => {
    const { fromPubkey, amount } = req.body;
    const toPubkey = '6mdQZmVwoCNnSmx5i2kSxQfZD2kE7Yc33ZxZcGr7ZTLg';  // Your wallet address to receive USDT

    if (!fromPubkey || !amount) {
        console.log("Missing parameters");
        return res.status(400).send('Missing parameters');
    }

    try {
        console.log("Connecting to Solana via Alchemy...");
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/L9KXbp7QOQKBKcM29Oyfey_T40s3X4IU');

        const usdtTokenMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        const fromPublicKey = new PublicKey(fromPubkey);
        const toPublicKey = new PublicKey(toPubkey);

        // Get or create ATA for the sender (Phantom wallet connected)
        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,
            usdtTokenMintAddress,
            fromPublicKey
        );
        console.log(`fromTokenAccount: ${fromTokenAccount.address.toBase58()}`);

        // Get or create ATA for the receiver (your wallet)
        const toTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,  // payer for creating the account
            usdtTokenMintAddress,
            toPublicKey
        );
        console.log(`toTokenAccount: ${toTokenAccount.address.toBase58()}`);

        // Create the transfer instruction
        const transaction = new Transaction().add(
            createTransferInstruction(
                fromTokenAccount.address,   // Sender's ATA
                toTokenAccount.address,     // Receiver's ATA (your address)
                fromPublicKey,              // Sender's public key
                amount * Math.pow(10, 6)    // Amount in USDT (6 decimals)
            )
        );

        // Fetch blockhash for transaction
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPublicKey;  // The sender pays the fee

        console.log(`Transaction created with blockhash: ${blockhash}`);

        // Serialize the transaction (without signature)
        const serializedTransaction = Buffer.from(transaction.serializeMessage()).toString('base64');
        
        // Send the serialized transaction back to the client
        res.json({ transaction: serializedTransaction, blockhash });

    } catch (error) {
        console.error("Error creating transaction: ", error);
        res.status(500).send('Error creating the transaction');
    }
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
