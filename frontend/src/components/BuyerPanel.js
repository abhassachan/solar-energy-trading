import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import EnergyTokenABI from '../contracts/EnergyToken.json';
import MarketplaceABI from '../contracts/Marketplace.json';
import addresses from '../contracts/addresses';

function BuyerPanel({ signer, account, provider, onSuccess }) {
  const [listings, setListings] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const getTokenContract = () => new ethers.Contract(addresses.EnergyToken, EnergyTokenABI.abi, signer);
  const getMarketplaceContract = () => new ethers.Contract(addresses.Marketplace, MarketplaceABI.abi, signer);

  const fetchListings = async () => {
    try {
      const contract = getMarketplaceContract();
      const active = await contract.getActiveListings();
      setListings(active.map(l => ({
        id: l.id.toString(),
        seller: l.seller,
        amount: l.amount.toString(),
        pricePerUnit: ethers.formatEther(l.pricePerUnit),
        totalPrice: ethers.formatEther(l.amount * l.pricePerUnit),
        totalPriceWei: l.amount * l.pricePerUnit
      })));
    } catch (err) { console.error(err); }
  };

  const fetchBalance = async () => {
    try {
      const contract = getTokenContract();
      const bal = await contract.getEnergyBalance(account);
      setBalance(bal.toString());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!provider) return;
    fetchListings();
    fetchBalance();
    const contract = new ethers.Contract(addresses.Marketplace, MarketplaceABI.abi, provider);
    contract.on('EnergyListed', fetchListings);
    contract.on('EnergyPurchased', () => { fetchListings(); fetchBalance(); });
    contract.on('ListingCancelled', fetchListings);
    return () => contract.removeAllListeners();
  }, [provider]);

  const handleBuyEnergy = async (listing) => {
    try {
      setLoading(true);
      setLoadingId(listing.id);
      const contract = getMarketplaceContract();
      toast.loading(`Buying ${listing.amount} kWh...`, { id: 'buy' });
      const tx = await contract.buyEnergy(listing.id, { value: listing.totalPriceWei });
      await tx.wait();
      toast.success(`Purchased ${listing.amount} kWh for ${listing.totalPrice} ETH!`, { id: 'buy' });
      fetchListings();
      fetchBalance();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.reason || err.message.slice(0, 60), { id: 'buy' });
    } finally {
      setLoading(false);
      setLoadingId(null);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <div className="panel-icon icon-orange">🛒</div>
            Buy Energy
          </div>
          <div className="panel-subtitle">Purchase solar energy tokens from producers</div>
        </div>
        <button className="btn-secondary" onClick={() => { fetchListings(); fetchBalance(); }}>↻ Refresh</button>
      </div>

      {/* Balance */}
      <div className="balance-card" data-icon="🛒">
        <div className="balance-label">Your Energy Token Balance</div>
        <div className="balance-value" style={{color: 'var(--accent2)'}}>
          {balance !== null ? `${balance} kWh` : '---'}
        </div>
        <div className="balance-sub">Tokens you've purchased</div>
      </div>

      {/* Listings */}
      <div className="section-title">
        Available Energy
        <span style={{color: 'var(--accent)', fontFamily: 'Space Mono'}}>
          {listings.length} available
        </span>
      </div>

      {listings.length === 0 ? (
        <p className="no-listings">No energy available. Check back soon!</p>
      ) : (
        <div className="listings-grid">
          {listings.map(listing => (
            <div key={listing.id} className="listing-card">
              <div className="listing-top">
                <span className="listing-id">#{listing.id}</span>
                <span className="listing-amount">{listing.amount} kWh</span>
              </div>
              <div className="listing-price">{listing.pricePerUnit} ETH/kWh</div>
              <div className="listing-total">Total: {listing.totalPrice} ETH</div>
              <div className="listing-seller">
                Seller: {listing.seller.slice(0,6)}...{listing.seller.slice(-4)}
              </div>
              {listing.seller.toLowerCase() === account.toLowerCase() ? (
                <div className="own-listing-badge">Your Listing</div>
              ) : (
                <button
                  className="btn-buy"
                  onClick={() => handleBuyEnergy(listing)}
                  disabled={loading}
                >
                  {loadingId === listing.id ? '⏳ Buying...' : '⚡ Buy Now'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BuyerPanel;