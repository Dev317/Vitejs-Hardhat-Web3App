import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { contractABI, contractAddress } from '../utils/constants';

export const TransactionContext = React.createContext();

// destructuring ethereum component from window browser
const { ethereum } = window;

const getEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();

    // fetching contract
    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);

    // console.log({
    //     provider,
    //     signer,
    //     transactionContract
    // });

    return transactionContract;
}

export const TransactionProvider = ({ children }) => {
    const [currentAccount, setCurrentAccount] = useState("");
    const [formData, setFormData] = useState({
        addressTo : "",
        amount    : "",
        keyword   : "",
        message   : ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem("transactionCount"));
    const [transactions, setTransactions] = useState([]);



    const handleChange = (event, name) => {
        setFormData((prevState) => ({...prevState, [name] : event.target.value}));
    };

    const getAllTransactions = async () => {
        try {
            if(!ethereum) {
                return alert("Please install Metamask");
            }

            const contract = getEthereumContract();

            const availableTransactions = await contract.getAllTransactions();
            
            const structuredTransactions = availableTransactions.map((transaction) => ({
                addressTo: transaction.receiver,
                addressFrom: transaction.sender,
                timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
                message: transaction.message,
                keyword: transaction.keyword,
                amount: parseInt(transaction.amount._hex) / (10 ** 18)
              }));

            console.log(structuredTransactions);
            setTransactions(structuredTransactions);

        } catch (err) {
            console.log(err);
        }
    }

    const checkIfWalletIsConnected = async () => {
        try {      
            if(!ethereum) {
                return alert("Please install Metamask");
            }

            const accounts = await ethereum.request({ method : 'eth_accounts' });

            if (accounts.length) {
                setCurrentAccount(accounts[0]);
                getAllTransactions();
            } else {
                console.log("No accounts found!");
            }
        } catch (err) {
            console.log(err);
            throw new Error("No ethereum object!");
        }

    };

    const checkIfTransactionsExist = async () => {
        try {
            const contract = getEthereumContract();
            const transactionCount = await contract.getTransactionCount();

            window.localStorage.setItem("transactionCount", transactionCount);
        } catch (err) {
            console.log(error);
            throw new Error("No ethereum object");
        }
    };

    const connectWallet = async () => {
        try {
            if(!ethereum) {
                return alert("Please install Metamask");
            }
            const accounts = await ethereum.request({ method : 'eth_requestAccounts' });

            setCurrentAccount(accounts[0]);
        } catch (err) {
            console.log(err);
            throw new Error("No ethereum object!");
        }
    };

    const sendTransaction = async () => {
        try {
            if(!ethereum) {
                return alert("Please install Metamask");
            }

            const { addressTo, amount, keyword, message } = formData;
            const contract = getEthereumContract();

            const parsedAmount = ethers.utils.parseEther(amount)

            console.log(currentAccount);
            console.log(addressTo);

            await ethereum.request({
                method : "eth_sendTransaction",
                params : [{
                    from : currentAccount,
                    to : addressTo,
                    gas : '0x5208', // 2100 gwei
                    value : parsedAmount._hex,
                }]
            });

            const transactionHash = await contract.addToBlockchain(addressTo, parsedAmount, message, keyword);
            setIsLoading(true);
            console.log(`Loading - ${transactionHash.hash}`);
            await transactionHash.wait();

            setIsLoading(false);
            console.log(`Success - ${transactionHash.hash}`);

            const transactionCount = await contract.getTransactionCount();

            setTransactionCount(transactionCount.toNumber());
            
            window.reload();
        } catch (err) {
            console.log(err);
            throw new Error("No ethereum object!");
        }
    };

    useEffect(() => {
        checkIfWalletIsConnected();
        checkIfTransactionsExist();
    }, []);

    return (
        <TransactionContext.Provider value={{ connectWallet, currentAccount, formData, setFormData, handleChange, sendTransaction, isLoading, transactions }}>
            {children}
        </TransactionContext.Provider>
    );
};