const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/get-transaction-data', async (req, res) => {
  const { fromPubkey, toPubkey, amount } = req.body;

  if (!fromPubkey || !toPubkey || !amount) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    // Connexion à Solana via Alchemy
    const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/L9KXbp7QOQKBKcM29Oyfey_T40s3X4IU');
    
    // Adresse du mint USDT sur Solana
    const usdtMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
    
    // Adresses de l'expéditeur et du destinataire
    const fromPublicKey = new PublicKey(fromPubkey);
    const toPublicKey = new PublicKey(toPubkey);

    // Récupérer ou créer les ATA (Associated Token Accounts) pour l'expéditeur et le destinataire
    const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      fromPublicKey,  // Payer (généralement l'utilisateur)
      usdtMintAddress,
      fromPublicKey
    );

    const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      fromPublicKey,  // Payer
      usdtMintAddress,
      toPublicKey
    );

    // Envoyer les informations nécessaires pour créer la transaction côté client
    res.json({
      fromTokenAccount: fromTokenAccount.address.toString(),
      toTokenAccount: toTokenAccount.address.toString(),
      usdtMintAddress: usdtMintAddress.toString(),
      amount: amount * Math.pow(10, 6),  // Convertir en base 6 pour les USDT (6 décimales)
    });

  } catch (error) {
    console.error('Error getting transaction data:', error);
    res.status(500).json({ error: 'Failed to get transaction data' });
  }
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
