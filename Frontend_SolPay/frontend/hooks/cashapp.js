import { useState, useEffect } from "react";
import { getAvatarUrl } from "../functions/getAvatarUrl";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";

export const useCashApp = () => 
{
    const [avatar, setAvatar] = useState("");

    const { connected, publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const [newTransactionModalOpen, setNewTransactionModalOpen] = useState(false)

    const useLocalStorage = (storageKey, fallBackState) => {
        const [value, setValue] = useState(
            JSON.parse(localStorage.getItem(storageKey)) ?? fallBackState
        );

        useEffect(() => 
        {
            localStorage.setItem(storageKey, JSON.stringify(value));
        }, [value, setValue]);
        return [value, setValue]
    }

    const [transactions, setTransactions] = useLocalStorage("transactions", []);

    useEffect(() => 
    {
        if(connected)
        {
            setAvatar(getAvatarUrl(publicKey));
        }
    }, [connected]);

    const makeTransaction = async (from, to, amount, ref) => 
    {
        const network = WalletAdapterNetwork.Devnet;
        const endpoint = clusterApiUrl(network);
        const connection = new Connection(endpoint);

        const { blockhash } = await connection.getLatestBlockhash("finalized");

        const transaction = new Transaction({recentBlockhash: blockhash, feePayer: from});
        const transferIX = SystemProgram.transfer({
            fromPubkey: from,
            toPubkey: to, 
            lamports: amount * LAMPORTS_PER_SOL
        });

        transferIX.keys.push({
            pubkey: ref,
            isSigner: false,
            isWritable: false
        });

        transaction.add(transferIX);

        return transaction;
    } 

    const doTransaction = async ({amount, receiver, transactionPurpose}) =>
    {
        try
        {
            const fromWallet = publicKey;
            const toWallet = new PublicKey(receiver);
            const bnAmount = new BigNumber(amount);
            const ref = Keypair.generate().publicKey;
            const transaction = makeTransaction(fromWallet, toWallet, bnAmount, ref);
    
            await sendTransaction(transaction, connection);
            const newID = (transactions.length + 1).toString();

            const newTransaction = {
                id: newID,
                from: {
                    name: publicKey,
                    handle: publicKey,
                    avatar: avatar,
                    verified: true
                },
                to: {
                    name: receiver,
                    handle: '-',
                    avatar: getAvatarUrl(receiver.toString()),
                    verified: false
                },
                description: transactionPurpose,
                transactionDate: new Date(),
                status: "Completed",
                amount: amount,
                source: '-',
                identifier: '-'
            };

            setNewTransactionModalOpen(false);
            setTransactions([newTransaction, ...transactions]);
        }
        catch(err)
        {
            console.log(err.message);
        }

    }

    return { connected, publicKey, avatar, doTransaction, transactions, setTransactions, newTransactionModalOpen, setNewTransactionModalOpen }
}