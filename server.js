const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const bs58 = require('bs58');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// Endpoint pour créer une transaction de transfert USDT
app.post('/create-transaction', async (req, res) => {
    const { fromPubkey, toPubkey, amount } = req.body;

    if (!fromPubkey || !toPubkey || !amount) {
        console.log("Paramètres manquants");
        return res.status(400).send('Missing parameters');
    }

    try {
        console.log("Connexion à Solana via Alchemy...");
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/L9KXbp7QOQKBKcM29Oyfey_T40s3X4IU'); 

        const usdtTokenMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        const fromPublicKey = new PublicKey(fromPubkey);
        const toPublicKey = new PublicKey(toPubkey);

        console.log(`Propriétaire de l'ATA (fromPubkey): ${fromPublicKey.toBase58()}`);

        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,
            usdtTokenMintAddress,
            fromPublicKey
        );
        console.log(`fromTokenAccount: ${fromTokenAccount.address.toBase58()}`);

        const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,
            usdtTokenMintAddress,
            toPublicKey
        );
        console.log(`toTokenAccount: ${toTokenAccount.address.toBase58()}`);

        const transaction = new Transaction().add(
            splToken.createTransferInstruction(
                fromTokenAccount.address,
                toTokenAccount.address,
                fromPublicKey,
                amount * Math.pow(10, 6)
            )
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPublicKey;
        console.log(`feePayer configuré comme : ${transaction.feePayer.toBase58()}`);

        const serializedTransaction = bs58.encode(transaction.serializeMessage());
        res.json({ transaction: serializedTransaction, blockhash: blockhash });

    } catch (error) {
        console.error("Erreur lors de la création de la transaction : ", error);
        res.status(500).send('Erreur lors de la création de la transaction');
    }
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
