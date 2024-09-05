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
        console.log("Connexion à Solana via Alchemy...");
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/L9KXbp7QOQKBKcM29Oyfey_T40s3X4IU'); 

        const usdtTokenMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        const fromPublicKey = new PublicKey(fromPubkey);  // Phantom wallet
        const toPublicKey = new PublicKey(toPubkey);  // Receiver wallet

        console.log(`fromPubkey (Phantom): ${fromPubkey}`);
        console.log(`toPubkey (Receiver): ${toPubkey}`);

        // Assurez-vous que l'ATA appartient bien à fromPublicKey
        console.log("Obtention de l'ATA pour l'expéditeur...");
        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,      // Phantom wallet connecté
            usdtTokenMintAddress,
            fromPublicKey        // Le propriétaire de l'ATA est le Phantom wallet connecté
        );

        console.log(`fromTokenAccount: ${fromTokenAccount.address.toBase58()}`);

        console.log("Obtention de l'ATA pour le destinataire...");
        const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,      // Phantom wallet connecté
            usdtTokenMintAddress,
            toPublicKey
        );

        console.log(`toTokenAccount: ${toTokenAccount.address.toBase58()}`);

        // Création de la transaction avec fromPublicKey comme propriétaire de l'ATA
        console.log("Création de la transaction...");
        const transaction = new Transaction().add(
            splToken.createTransferInstruction(
                fromTokenAccount.address,   // ATA de l'expéditeur (source)
                toTokenAccount.address,     // ATA du destinataire (cible)
                fromPublicKey,              // Propriétaire de l'ATA (Phantom wallet connecté)
                amount * Math.pow(10, 6)    // Montant en USDT (6 décimales)
            )
        );

        // Récupération du blockhash
        console.log("Récupération du blockhash...");
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPublicKey;  // Le feePayer est le portefeuille Phantom connecté

        console.log(`Transaction créée avec blockhash: ${blockhash}`);

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
