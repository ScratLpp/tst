const express = require('express');
const bodyParser = require('body-parser');
const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/create-transaction', async (req, res) => {
    const { fromPubkey, toPubkey, amount } = req.body;

    if (!fromPubkey || !toPubkey || !amount) {
        return res.status(400).send('Missing parameters');
    }

    try {
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/L9KXbp7QOQKBKcM29Oyfey_T40s3X4IU');
        const usdtMint = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        const fromPublicKey = new PublicKey(fromPubkey);
        const toPublicKey = new PublicKey(toPubkey);

        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,
            usdtMint,
            fromPublicKey
        );

        const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            fromPublicKey,
            usdtMint,
            toPublicKey
        );

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

        // Envoyer la transaction sous forme d'object JSON
        res.json({
            transaction: {
                instructions: transaction.instructions.map(i => ({
                    keys: i.keys.map(k => ({ pubkey: k.pubkey.toBase58(), isSigner: k.isSigner, isWritable: k.isWritable })),
                    programId: i.programId.toBase58(),
                    data: i.data.toString('base64')
                })),
                recentBlockhash: transaction.recentBlockhash,
                feePayer: transaction.feePayer.toBase58()
            }
        });
    } catch (error) {
        console.error("Erreur lors de la création de la transaction :", error);
        res.status(500).send('Erreur lors de la création de la transaction');
    }
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
