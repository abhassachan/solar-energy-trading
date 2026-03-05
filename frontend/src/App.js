import { useCallback } from 'react';
import { useWallet } from './hooks/useWallet';
import { useContractEvents } from './hooks/useContractEvents';
import ProducerPanel from './components/ProducerPanel';
import MarketplacePanel from './components/MarketplacePanel';
import BuyerPanel from './components/BuyerPanel';
import TransactionHistory from './components/TransactionHistory';
import './App.css';

function App() {
  const { account, signer, provider, error, connectWallet, disconnectWallet } = useWallet();

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  // Real-time event handlers
  const handleEnergyListed = useCallback((event) => {
    console.log('⚡ New energy listed!', event);
    // MarketplacePanel will auto-refresh via its own listener
  }, []);

  const handleEnergyPurchased = useCallback((event) => {
    console.log('💰 Energy purchased!', event);
  }, []);

  const handleListingCancelled = useCallback((event) => {
    console.log('❌ Listing cancelled!', event);
  }, []);

  // Set up real-time blockchain event listeners
  useContractEvents(provider, {
    onEnergyListed: handleEnergyListed,
    onEnergyPurchased: handleEnergyPurchased,
    onListingCancelled: handleListingCancelled
  });

  return (
    <div className="App">
      <header className="app-header">
        <h1>⚡ Solar Energy Trading</h1>
        <div className="wallet-section">
          {account ? (
            <div className="wallet-connected">
              <span className="wallet-address">🟢 {shortAddress}</span>
              <button className="btn-disconnect" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          ) : (
            <button className="btn-connect" onClick={connectWallet}>
              🦊 Connect MetaMask
            </button>
          )}
        </div>
      </header>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <main className="app-main">
        {account ? (
          <div className="dashboard">
            <ProducerPanel signer={signer} account={account} />
            <MarketplacePanel signer={signer} account={account} provider={provider} />
            <BuyerPanel signer={signer} account={account} provider={provider} />
            <TransactionHistory provider={provider} />
          </div>
        ) : (
          <div className="welcome">
            <h2>Welcome to P2P Solar Energy Trading</h2>
            <p>Connect your MetaMask wallet to start trading solar energy.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;