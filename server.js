// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey, clusterApiUrl, Transaction } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Ajouter un middleware pour loguer toutes les requêtes
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// Endpoint pour créer une transaction de transfert USDT
app.post('/create-transaction', async (req, res) => {
    console.log("Requête POST reçue sur /create-transaction");

    const { fromPubkey, toPubkey, amount } = req.body;

    console.log("Corps de la requête : ", req.body); // Log pour vérifier les paramètres reçus

    if (!fromPubkey || !toPubkey || !amount) {
        console.log("Paramètres manquants");
        return res.status(400).send('Missing parameters');
    }

    try {
        console.log("Connexion à Solana...");
        const connection = new Connection(clusterApiUrl('mainnet-beta'));

        const usdtTokenMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        const fromPublicKey = new PublicKey(fromPubkey);
        const toPublicKey = new PublicKey(toPubkey);

        console.log("Obtention de l'ATA pour l'utilisateur...");
        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,
            usdtTokenMintAddress,
            fromPublicKey
        );

        console.log("Obtention de l'ATA pour le destinataire...");
        const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,
            usdtTokenMintAddress,
            toPublicKey
        );

        console.log("Création de la transaction...");
        const transaction = new Transaction().add(
            splToken.createTransferInstruction(
                fromTokenAccount.address,
                toTokenAccount.address,
                fromPublicKey,
                amount * Math.pow(10, 6) // Montant en USDT (6 décimales)
            )
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPublicKey;

        console.log("Transaction créée avec succès avec recentBlockhash.");

        // Sérialiser uniquement le message de la transaction sans signature
        const serializedMessage = transaction.serializeMessage().toString('base64');
        res.json({ transaction: serializedMessage });
    } catch (error) {
        console.error("Erreur lors de la création de la transaction : ", error);
        res.status(500).send('Erreur lors de la création de la transaction');
    }
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
