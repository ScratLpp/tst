// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const Buffer = require('buffer').Buffer;

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Endpoint pour créer une transaction de transfert USDT
app.post('/create-transaction', async (req, res) => {
    const { fromPubkey, toPubkey, amount } = req.body;

    if (!fromPubkey || !toPubkey || !amount) {
        return res.status(400).send('Missing parameters');
    }

    try {
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/L9KXbp7QOQKBKcM29Oyfey_T40s3X4IU'); // Utilisez Alchemy pour une meilleure fiabilité

        const usdtTokenMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        const fromPublicKey = new PublicKey(fromPubkey);
        const toPublicKey = new PublicKey(toPubkey);

        // Vérifiez que le fromPublicKey correspond bien à Phantom
        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,      // Le portefeuille Phantom connecté
            usdtTokenMintAddress,
            fromPublicKey        // Le propriétaire de l'ATA doit être Phantom
        );

        const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,      // Le portefeuille Phantom connecté
            usdtTokenMintAddress,
            toPublicKey
        );

        // Création de la transaction
        const transaction = new Transaction().add(
            splToken.createTransferInstruction(
                fromTokenAccount.address,   // ATA de l'expéditeur
                toTokenAccount.address,     // ATA du destinataire
                fromPublicKey,              // Le propriétaire (Phantom)
                amount * Math.pow(10, 6)    // Montant en USDT
            )
        );

        // Récupération du blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPublicKey;  // Assurez-vous que le feePayer est le portefeuille Phantom

        // Sérialiser la transaction sans la signer
        const serializedTransaction = Buffer.from(transaction.serializeMessage()).toString('base64');
        
        // Réponse avec la transaction et le blockhash
        res.json({ transaction: serializedTransaction, blockhash: blockhash });
    } catch (error) {
        console.error("Erreur lors de la création de la transaction : ", error);
        res.status(500).send('Erreur lors de la création de la transaction');
    }
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
