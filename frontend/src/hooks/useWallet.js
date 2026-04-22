import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [error, setError] = useState(null);

  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask not found. Please install it from metamask.io");
        return;
      }

      // Request accounts
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Force switch to Hardhat Local network (chainId 31337 = 0x7a69)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }],
        });
      } catch (switchError) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x7a69',
              chainName: 'Hardhat Local',
              rpcUrls: ['http://127.0.0.1:8545'],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              }
            }]
          });
        }
      }

      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _account = await _signer.getAddress();

      setProvider(_provider);
      setSigner(_signer);
      setAccount(_account);
      setError(null);

      // Listen for network changes
      window.ethereum.on('chainChanged', () => window.location.reload());

      // Listen for account changes
      window.ethereum.on('accountsChanged', () => {
        window.location.reload();
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