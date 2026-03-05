/* global BigInt */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import EnergyTokenABI from '../contracts/EnergyToken.json';
import MarketplaceABI from '../contracts/Marketplace.json';
import addresses from '../contracts/addresses';


const ENERGY_TOKEN_ADDRESS = addresses.EnergyToken;
const MARKETPLACE_ADDRESS = addresses.Marketplace;

function MarketplacePanel({ signer, account, provider }) {
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Auto-refresh listings when blockchain events occur
useEffect(() => {
  if (!provider) return;
  const marketplace = new ethers.Contract(
    addresses.Marketplace, MarketplaceABI.abi, provider
  );
  marketplace.on('EnergyListed', fetchListings);
  marketplace.on('EnergyPurchased', fetchListings);
  marketplace.on('ListingCancelled', fetchListings);
  return () => marketplace.removeAllListeners();
}, [provider]);

  const getTokenContract = () => new ethers.Contract(
    ENERGY_TOKEN_ADDRESS, EnergyTokenABI.abi, signer
  );

  const getMarketplaceContract = () => new ethers.Contract(
    MARKETPLACE_ADDRESS, MarketplaceABI.abi, signer
  );

  // List energy for sale
  const handleListEnergy = async () => {
    if (!amount || !price || amount <= 0 || price <= 0) {
      setMessage({ type: 'error', text: 'Please enter valid amount and price' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Step 1/2: Approving tokens...' });

      const tokenContract = getTokenContract();
      const marketplaceContract = getMarketplaceContract();

      // Step 1: Approve marketplace to spend tokens
      // (Like giving the marketplace permission to take your tokens)
      const tokenAmount = ethers.parseUnits(amount, 18);
      const approveTx = await tokenContract.approve(MARKETPLACE_ADDRESS, tokenAmount);
      await approveTx.wait();

      setMessage({ type: 'info', text: 'Step 2/2: Creating listing...' });

      // Step 2: List energy on marketplace
      const priceInWei = ethers.parseEther(price); // Convert ETH to wei
      const listTx = await marketplaceContract.listEnergy(amount, priceInWei);
      await listTx.wait();

      setMessage({ type: 'success', text: `✅ Listed ${amount} kWh at ${price} ETH/kWh!` });
      setAmount('');
      setPrice('');
      fetchListings(); // Refresh listings

    } catch (err) {
      setMessage({ type: 'error', text: `❌ Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all active listings
  const fetchListings = async () => {
    try {
      const marketplaceContract = getMarketplaceContract();
      const activeListings = await marketplaceContract.getActiveListings();

      // Format listings for display
      const formatted = activeListings.map(listing => ({
        id: listing.id.toString(),
        seller: listing.seller,
        amount: listing.amount.toString(),
        pricePerUnit: ethers.formatEther(listing.pricePerUnit),
        totalPrice: ethers.formatEther(
          BigInt(listing.amount) * BigInt(listing.pricePerUnit)
        )
      }));

      setListings(formatted);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    }
  };

  // Cancel a listing
  const handleCancelListing = async (listingId) => {
    try {
      setLoading(true);
      const marketplaceContract = getMarketplaceContract();
      const tx = await marketplaceContract.cancelListing(listingId);
      await tx.wait();
      setMessage({ type: 'success', text: '✅ Listing cancelled, tokens returned!' });
      fetchListings();
    } catch (err) {
      setMessage({ type: 'error', text: `❌ Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>🏪 Marketplace</h2>
      <p className="panel-subtitle">List your energy tokens for sale</p>

      {/* List Energy Form */}
      <div className="form-row">
        <div className="form-group">
          <label>Amount to sell (kWh)</label>
          <input
            type="number"
            placeholder="e.g. 5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            className="input-field"
          />
        </div>
        <div className="form-group">
          <label>Price per kWh (ETH)</label>
          <input
            type="number"
            placeholder="e.g. 0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            step="0.001"
            className="input-field"
          />
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={handleListEnergy}
        disabled={loading}
      >
        {loading ? '⏳ Processing...' : '📋 List Energy for Sale'}
      </button>

      {/* Status Message */}
      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Active Listings */}
      <div className="listings-section">
        <div className="listings-header">
          <h3>Active Listings</h3>
          <button className="btn-secondary" onClick={fetchListings}>
            🔄 Refresh
          </button>
        </div>

        {listings.length === 0 ? (
          <p className="no-listings">No active listings. Be the first to list!</p>
        ) : (
          <div className="listings-grid">
            {listings.map(listing => (
              <div key={listing.id} className="listing-card">
                <div className="listing-top">
                  <span className="listing-id">#{listing.id}</span>
                  <span className="listing-amount">{listing.amount} kWh</span>
                </div>
                <div className="listing-price">
                  {listing.pricePerUnit} ETH/kWh
                </div>
                <div className="listing-total">
                  Total: {listing.totalPrice} ETH
                </div>
                <div className="listing-seller">
                  {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                </div>
                {listing.seller.toLowerCase() === account.toLowerCase() && (
                  <button
                    className="btn-cancel"
                    onClick={() => handleCancelListing(listing.id)}
                    disabled={loading}
                  >
                    Cancel Listing
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketplacePanel;    