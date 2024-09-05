// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Middleware pour loguer toutes les requêtes
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// Endpoint pour obtenir l'adresse du compte associé au token (ATA)
app.post('/get-ata', async (req, res) => {
    const { fromPubkey, mintAddress } = req.body;

    if (!fromPubkey || !mintAddress) {
        return res.status(400).send('Missing parameters');
    }

    try {
        const connection = new Connection(clusterApiUrl('mainnet-beta'));
        const fromPublicKey = new PublicKey(fromPubkey);
        const mintPublicKey = new PublicKey(mintAddress);

        const ata = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,  // Le wallet utilisateur
            mintPublicKey,  // Adresse du token mint
            fromPublicKey   // Propriétaire du wallet
        );

        res.json({ ata: ata.address.toBase58() });
    } catch (error) {
        console.error("Erreur lors de l'obtention de l'ATA : ", error);
        res.status(500).send('Erreur lors de l\'obtention de l\'ATA');
    }
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
