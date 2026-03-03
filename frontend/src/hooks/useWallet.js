import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

/**
 * Custom hook to handle MetaMask wallet connection
 * Returns wallet state and connect function
 */
export function useWallet() {
  const [account, setAccount] = useState(null);      // connected wallet address
  const [provider, setProvider] = useState(null);    // ethers provider
  const [signer, setSigner] = useState(null);        // used to sign transactions
  const [error, setError] = useState(null);

  const connectWallet = useCallback(async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError("MetaMask not found. Please install it from metamask.io");
        return;
      }

      // Ask MetaMask to connect
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create ethers provider from MetaMask
      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _account = await _signer.getAddress();

      setProvider(_provider);
      setSigner(_signer);
      setAccount(_account);
      setError(null);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || null);
      });

    } catch (err) {
      setError(err.message);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
  }, []);

  return { account, provider, signer, error, connectWallet, disconnectWallet };
}