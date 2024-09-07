const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const { serialize } = require('borsh');
const Buffer = require('buffer').Buffer;

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

class TransactionData {
    constructor(properties) {
        Object.keys(properties).map((key) => {
            return (this[key] = properties[key]);
        });
    }
}

const transactionSchema = new Map([
    [
        TransactionData,
        {
            kind: 'struct',
            fields: [
                ['transaction', 'u8'],
                ['blockhash', 'string'],
            ],
        },
    ],
]);

app.post('/create-transaction', async (req, res) => {
    const { fromPubkey, toPubkey, amount } = req.body;

    if (!fromPubkey || !toPubkey || !amount) {
        return res.status(400).send('Missing parameters');
    }

    try {
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/L9KXbp7QOQKBKcM29Oyfey_T40s3X4IU');
        const usdtTokenMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        const fromPublicKey = new PublicKey(fromPubkey);
        const toPublicKey = new PublicKey(toPubkey);

        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(connection, fromPublicKey, usdtTokenMintAddress, fromPublicKey);
        const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(connection, fromPublicKey, usdtTokenMintAddress, toPublicKey);

        const transaction = new Transaction().add(
            splToken.createTransferInstruction(
                fromTokenAccount.address,
                toTokenAccount.address,
                fromPublicKey,
                amount * Math.pow(10, 6) // USDT uses 6 decimal places
            )
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPublicKey;

        // Serialize the transaction with Borsh
        const transactionData = new TransactionData({
            transaction: transaction.serializeMessage(),
            blockhash: blockhash,
        });

        const serializedTransaction = serialize(transactionSchema, transactionData).toString('base64');
        res.json({ transaction: serializedTransaction });

    } catch (error) {
        console.error("Error creating transaction: ", error);
        res.status(500).send('Error creating transaction');
    }
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
