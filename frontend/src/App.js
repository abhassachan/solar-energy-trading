import { useState, useCallback, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { useWallet } from './hooks/useWallet';
import { useContractEvents } from './hooks/useContractEvents';
import ProducerPanel from './components/ProducerPanel';
import MarketplacePanel from './components/MarketplacePanel';
import BuyerPanel from './components/BuyerPanel';
import AuctionPanel from './components/AuctionPanel';
import CertificatesPanel from './components/CertificatesPanel';
import TransactionHistory from './components/TransactionHistory';
import MarketplaceABI from './contracts/Marketplace.json';
import EnergyTokenABI from './contracts/EnergyToken.json';
import EnergyAuctionABI from './contracts/EnergyAuction.json';
import EnergyCertificateABI from './contracts/EnergyCertificate.json';
import addresses from './contracts/addresses';
import './App.css';

function App() {
  const { account, signer, provider, error, connectWallet, disconnectWallet } = useWallet();
  const [activeTab, setActiveTab] = useState('producer');
  const [stats, setStats] = useState({
    totalEnergy: 0,
    totalVolume: 0,
    activeListings: 0,
    yourBalance: 0
  });

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  // Fetch platform stats
  const fetchStats = useCallback(async () => {
    if (!provider || !account) return;
    try {
      const marketplace = new ethers.Contract(addresses.Marketplace, MarketplaceABI.abi, provider);
      const token = new ethers.Contract(addresses.EnergyToken, EnergyTokenABI.abi, provider);

      const listings = await marketplace.getActiveListings();
      const balance = await token.getEnergyBalance(account);

      // Sum up total energy and volume from all purchase events
      const filter = marketplace.filters.EnergyPurchased();
      const events = await marketplace.queryFilter(filter, 0, 'latest');

      let totalEnergy = 0;
      let totalVolume = 0;
      events.forEach(e => {
        totalEnergy += Number(e.args[3]);
        totalVolume += Number(ethers.formatEther(e.args[4]));
      });

      setStats({
        totalEnergy,
        totalVolume: totalVolume.toFixed(3),
        activeListings: listings.length,
        yourBalance: balance.toString()
      });
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, [provider, account]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time event handlers with toast notifications
  const handleEnergyListed = useCallback((event) => {
    toast.success(`New listing: ${event.amount} kWh @ ${event.pricePerUnit} ETH/kWh`, {
      icon: '📋'
    });
    fetchStats();
  }, [fetchStats]);

  const handleEnergyPurchased = useCallback((event) => {
    toast.success(`${event.amount} kWh sold for ${event.totalPrice} ETH!`, {
      icon: '💰'
    });
    fetchStats();
  }, [fetchStats]);

  const handleListingCancelled = useCallback((event) => {
    toast(`Listing #${event.id} cancelled`, { icon: '❌' });
    fetchStats();
  }, [fetchStats]);

  const handleAuctionCreated = useCallback((event) => {
    toast.success(`New auction: ${event.amount} kWh starting at ${event.startingPrice} ETH`, { icon: '🔨' });
    fetchStats();
  }, [fetchStats]);

  const handleBidPlaced = useCallback((event) => {
    toast.success(`New bid: ${event.bid} ETH on auction #${event.id}`, { icon: '💰' });
    fetchStats();
  }, [fetchStats]);

  const handleAuctionEnded = useCallback((event) => {
    toast.success(`Auction #${event.id} ended! ${event.amount} kWh sold`, { icon: '🏁' });
    fetchStats();
  }, [fetchStats]);

  const handleCertificateMinted = useCallback((event) => {
    toast.success(`🏆 You received Green Energy Certificate #${event.id}!`, { duration: 5000 });
  }, []);

  useContractEvents(provider, {
    onEnergyListed: handleEnergyListed,
    onEnergyPurchased: handleEnergyPurchased,
    onListingCancelled: handleListingCancelled,
    onAuctionCreated: handleAuctionCreated,
    onBidPlaced: handleBidPlaced,
    onAuctionEnded: handleAuctionEnded,
    onCertificateMinted: handleCertificateMinted
  });

  const tabs = [
    { id: 'producer', label: 'Producer', icon: '⚡', badge: stats.yourBalance > 0 ? `${stats.yourBalance} kWh` : null },
    { id: 'marketplace', label: 'Marketplace', icon: '🏪', badge: stats.activeListings > 0 ? stats.activeListings : null },
    { id: 'buy', label: 'Buy Energy', icon: '🛒', badge: null },
    { id: 'auction', label: 'Auctions', icon: '🔨', badge: null },
    { id: 'certificates', label: 'Certificates', icon: '🎖️', badge: null },
    { id: 'history', label: 'History', icon: '📜', badge: null },
  ];

  return (
    <div className="app">
      {/* Background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0d1117',
            color: '#e8f4f8',
            border: '1px solid #1e2d3d',
            fontFamily: 'Syne, sans-serif',
            fontSize: '0.88rem',
          },
          success: {
            iconTheme: { primary: '#00ff88', secondary: '#000' }
          }
        }}
      />

      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <div>
            <div className="logo-text">Solar<span>Trade</span></div>
          </div>
        </div>

        <div className="header-right">
          {account && (
            <div className="network-badge">
              <div className="dot" />
              Hardhat Local
            </div>
          )}
          {account ? (
            <>
              <div className="wallet-info">🦊 {shortAddress}</div>
              <button className="btn-disconnect" onClick={disconnectWallet}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="btn-connect" onClick={connectWallet}>
              🦊 Connect MetaMask
            </button>
          )}
        </div>
      </header>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {account ? (
        <>
          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-label">Total Energy Traded</div>
              <div className="stat-value green">{stats.totalEnergy} kWh</div>
              <div className="stat-sub">all time</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Volume</div>
              <div className="stat-value blue">{stats.totalVolume} ETH</div>
              <div className="stat-sub">all time</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Active Listings</div>
              <div className="stat-value orange">{stats.activeListings}</div>
              <div className="stat-sub">available now</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Your Balance</div>
              <div className="stat-value yellow">{stats.yourBalance} kWh</div>
              <div className="stat-sub">{shortAddress}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
                {tab.badge && <span className="tab-badge">{tab.badge}</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <main className="app-main">
            {activeTab === 'producer' && (
              <ProducerPanel
                signer={signer}
                account={account}
                onSuccess={fetchStats}
              />
            )}
            {activeTab === 'marketplace' && (
              <MarketplacePanel
                signer={signer}
                account={account}
                provider={provider}
                onSuccess={fetchStats}
              />
            )}
            {activeTab === 'buy' && (
              <BuyerPanel
                signer={signer}
                account={account}
                provider={provider}
                onSuccess={fetchStats}
              />
            )}
            {activeTab === 'auction' && (
              <AuctionPanel
                signer={signer}
                account={account}
                provider={provider}
                onSuccess={fetchStats}
              />
            )}
            {activeTab === 'certificates' && (
              <CertificatesPanel
                provider={provider}
                account={account}
              />
            )}
            {activeTab === 'history' && (
              <TransactionHistory provider={provider} />
            )}
          </main>
        </>
      ) : (
        <div className="welcome">
          <div className="welcome-icon">⚡</div>
          <h2>Welcome to <span>SolarTrade</span></h2>
          <p>The decentralized peer-to-peer solar energy marketplace</p>
        </div>
      )}
    </div>
  );
}

export default App;