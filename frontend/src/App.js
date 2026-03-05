import { useWallet } from './hooks/useWallet';
import ProducerPanel from './components/ProducerPanel';
import MarketplacePanel from './components/MarketplacePanel';
import BuyerPanel from './components/BuyerPanel';
import './App.css';

function App() {
  const { account, signer, error, connectWallet, disconnectWallet } = useWallet();

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

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
            <MarketplacePanel signer={signer} account={account} />
            <BuyerPanel signer={signer} account={account} />
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