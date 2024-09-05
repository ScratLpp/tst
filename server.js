const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const Buffer = require('buffer').Buffer;

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Middleware pour loguer les requêtes
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

app.post('/create-transaction', async (req, res) => {
    const { fromPubkey, toPubkey, amount } = req.body;

    if (!fromPubkey || !toPubkey || !amount) {
        return res.status(400).send('Missing parameters');
    }

    try {
        console.log("Connexion à Solana via Alchemy...");
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY'); 

        const usdtTokenMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        const fromPublicKey = new PublicKey(fromPubkey);  // Clé publique envoyée par le client (portefeuille Phantom)
        const toPublicKey = new PublicKey(toPubkey);

        console.log(`Propriétaire de l'ATA (fromPubkey): ${fromPublicKey.toBase58()}`);

        // Obtenir ou créer l'ATA pour l'expéditeur (Phantom wallet connecté)
        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,
            usdtTokenMintAddress,
            fromPublicKey   // Le propriétaire de l'ATA est l'adresse envoyée par le client
        );
        console.log(`fromTokenAccount: ${fromTokenAccount.address.toBase58()}`);

        // Obtenir ou créer l'ATA pour le destinataire
        const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,
            usdtTokenMintAddress,
            toPublicKey
        );
        console.log(`toTokenAccount: ${toTokenAccount.address.toBase58()}`);

        // Création de la transaction
        const transaction = new Transaction().add(
            splToken.createTransferInstruction(
                fromTokenAccount.address,   // ATA de l'expéditeur (source)
                toTokenAccount.address,     // ATA du destinataire (cible)
                fromPublicKey,              // Le propriétaire de l'ATA est aussi la clé publique du wallet connecté (Phantom)
                amount * Math.pow(10, 6)    // Montant en USDT (6 décimales)
            )
        );

        // Récupérer le blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        // Le feePayer est aussi le portefeuille Phantom (fromPubkey)
        transaction.feePayer = fromPublicKey;
        console.log(`feePayer configuré comme : ${transaction.feePayer.toBase58()}`);

        // Sérialiser la transaction sans la signer
        const serializedTransaction = Buffer.from(transaction.serializeMessage()).toString('base64');
        res.json({ transaction: serializedTransaction, blockhash: blockhash });

    } catch (error) {
        console.error("Erreur lors de la création de la transaction : ", error);
        res.status(500).send('Erreur lors de la création de la transaction');
    }
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
