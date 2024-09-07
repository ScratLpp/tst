const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const app = express();
const port = process.env.PORT || 3000;

// Utilisation de body-parser pour interpréter le JSON
app.use(bodyParser.json());

app.post('/create-transaction-data', async (req, res) => {
    const { fromPubkey, toPubkey, amount } = req.body;

    // Vérification des paramètres
    if (!fromPubkey || !toPubkey || !amount) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    try {
        // Connexion à Alchemy pour Solana mainnet
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/L9KXbp7QOQKBKcM29Oyfey_T40s3X4IU');  

        // Adresse du mint pour USDT sur Solana
        const usdtMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');

        // Conversion des clés publiques en objets PublicKey
        const fromPublicKey = new PublicKey(fromPubkey);
        const toPublicKey = new PublicKey(toPubkey);

        // Récupérer ou créer l'ATA (Associated Token Account) pour l'expéditeur
        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,  // Payer
            usdtMintAddress,
            fromPublicKey    // Propriétaire du compte
        );

        // Récupérer ou créer l'ATA pour le destinataire
        const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,  // Payer
            usdtMintAddress,
            toPublicKey    // Propriétaire du compte
        );

        // Envoyer les informations nécessaires pour créer la transaction côté client
        res.json({
            fromTokenAccount: fromTokenAccount.address.toString(),
            toTokenAccount: toTokenAccount.address.toString(),
            amount
        });
    } catch (error) {
        console.error('Error creating transaction data:', error);
        res.status(500).json({ error: 'Failed to create transaction data' });
    }
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
