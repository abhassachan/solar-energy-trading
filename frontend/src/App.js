import { useWallet } from './hooks/useWallet';
import './App.css';

function App() {
  const { account, error, connectWallet, disconnectWallet } = useWallet();

  // Shorten address for display: 0x1234...5678
  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <h1>⚡ Solar Energy Trading</h1>

        {/* Wallet Connection */}
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

      {/* Error Message */}
      {error && <div className="error-banner">⚠️ {error}</div>}

      {/* Main Content */}
      <main className="app-main">
        {account ? (
          <p>✅ Wallet connected! Dashboard coming next...</p>
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