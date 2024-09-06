const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, createTransferInstruction } = require('@solana/spl-token');
const Buffer = require('buffer').Buffer;

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Créer une transaction de transfert de USDT
app.post('/create-transaction', async (req, res) => {
    const { fromPubkey, toPubkey, amount } = req.body;

    // Vérification des paramètres
    if (!fromPubkey || !toPubkey || !amount) {
        console.log("Missing parameters");
        return res.status(400).send('Missing parameters');
    }

    try {
        console.log("Connecting to Solana via Alchemy...");

        // Connexion à Solana via Alchemy
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/L9KXbp7QOQKBKcM29Oyfey_T40s3X4IU'); 

        const usdtTokenMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        const fromPublicKey = new PublicKey(fromPubkey);
        const toPublicKey = new PublicKey(toPubkey);

        console.log(`Propriétaire de l'ATA (fromPubkey): ${fromPublicKey.toBase58()}`);

        // Obtenir ou créer les ATA pour l'expéditeur et le destinataire
        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromPublicKey, usdtTokenMintAddress, fromPublicKey);
        console.log(`fromTokenAccount: ${fromTokenAccount.address.toBase58()}`);

        const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromPublicKey, usdtTokenMintAddress, toPublicKey);
        console.log(`toTokenAccount: ${toTokenAccount.address.toBase58()}`);

        // Création de la transaction
        const transaction = new Transaction().add(
            createTransferInstruction(
                fromTokenAccount.address,
                toTokenAccount.address,
                fromPublicKey,
                amount * Math.pow(10, 6) // Montant en USDT (6 décimales)
            )
        );

        // Récupérer le blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        // Le feePayer est aussi le portefeuille Phantom (fromPubkey)
        transaction.feePayer = fromPublicKey;
        console.log(`feePayer configuré comme : ${transaction.feePayer.toBase58()}`);

        // Ne pas utiliser `transaction.serialize()` ici, car nous n'avons pas de signature
        // Sérialiser uniquement le message de la transaction
        const serializedTransaction = Buffer.from(transaction.serializeMessage()).toString('base64');
        
        // Répondre au client avec la transaction sérialisée et le blockhash
        res.json({ transaction: serializedTransaction, blockhash });

    } catch (error) {
        console.error("Error creating transaction: ", error);
        res.status(500).send('Error creating the transaction');
    }
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
