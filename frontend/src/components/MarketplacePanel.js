import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import EnergyTokenABI from '../contracts/EnergyToken.json';
import MarketplaceABI from '../contracts/Marketplace.json';
import addresses from '../contracts/addresses';

function MarketplacePanel({ signer, account, provider, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

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
        totalPrice: ethers.formatEther(l.amount * l.pricePerUnit)
      })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!provider) return;
    fetchListings();
    const contract = new ethers.Contract(addresses.Marketplace, MarketplaceABI.abi, provider);
    contract.on('EnergyListed', fetchListings);
    contract.on('EnergyPurchased', fetchListings);
    contract.on('ListingCancelled', fetchListings);
    return () => contract.removeAllListeners();
  }, [provider]);

  const handleListEnergy = async () => {
    if (!amount || !price || amount <= 0 || price <= 0) {
      toast.error('Please enter valid amount and price');
      return;
    }
    try {
      setLoading(true);
      const tokenContract = getTokenContract();
      const marketplaceContract = getMarketplaceContract();
      toast.loading('Step 1/2: Approving tokens...', { id: 'list' });
      const approveTx = await tokenContract.approve(addresses.Marketplace, ethers.parseUnits(amount, 18));
      await approveTx.wait();
      toast.loading('Step 2/2: Creating listing...', { id: 'list' });
      const listTx = await marketplaceContract.listEnergy(amount, ethers.parseEther(price));
      await listTx.wait();
      toast.success(`Listed ${amount} kWh at ${price} ETH/kWh!`, { id: 'list' });
      setAmount(''); setPrice('');
      fetchListings();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.reason || err.message.slice(0, 60), { id: 'list' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async (listingId) => {
    try {
      setLoading(true);
      const contract = getMarketplaceContract();
      toast.loading('Cancelling listing...', { id: 'cancel' });
      const tx = await contract.cancelListing(listingId);
      await tx.wait();
      toast.success('Listing cancelled!', { id: 'cancel' });
      fetchListings();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.reason || err.message.slice(0, 60), { id: 'cancel' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <div className="panel-icon icon-blue">🏪</div>
            Marketplace
          </div>
          <div className="panel-subtitle">List your energy tokens for sale</div>
        </div>
        <button className="btn-secondary" onClick={fetchListings}>↻ Refresh</button>
      </div>

      {/* List Form */}
      <div className="form-row">
        <div className="form-group">
          <label className="input-label">Amount (kWh)</label>
          <input type="number" placeholder="e.g. 5" value={amount}
            onChange={(e) => setAmount(e.target.value)} min="1" className="input-field" />
        </div>
        <div className="form-group">
          <label className="input-label">Price/kWh (ETH)</label>
          <input type="number" placeholder="e.g. 0.01" value={price}
            onChange={(e) => setPrice(e.target.value)} min="0" step="0.001" className="input-field" />
        </div>
      </div>

      <button className="btn-primary blue" onClick={handleListEnergy} disabled={loading}>
        {loading ? '⏳ Processing...' : '📋 List Energy for Sale'}
      </button>

      {/* Listings */}
      <div className="section-title">
        Active Listings
        <span style={{color: 'var(--accent)', fontFamily: 'Space Mono'}}>
          {listings.length} listed
        </span>
      </div>

      {listings.length === 0 ? (
        <p className="no-listings">No active listings yet. Be the first to list!</p>
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
                {listing.seller.slice(0,6)}...{listing.seller.slice(-4)}
              </div>
              {listing.seller.toLowerCase() === account.toLowerCase() ? (
                <button className="btn-cancel" onClick={() => handleCancelListing(listing.id)} disabled={loading}>
                  ✕ Cancel
                </button>
              ) : (
                <div className="own-listing-badge" style={{background:'rgba(0,136,255,0.08)',borderColor:'rgba(0,136,255,0.2)',color:'var(--accent2)'}}>
                  Others Listing
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MarketplacePanel;