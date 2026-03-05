import { useState,useEffect } from 'react';
import { ethers } from 'ethers';
import EnergyTokenABI from '../contracts/EnergyToken.json';
import MarketplaceABI from '../contracts/Marketplace.json';
import addresses from '../contracts/addresses';


const ENERGY_TOKEN_ADDRESS = addresses.EnergyToken;
const MARKETPLACE_ADDRESS = addresses.Marketplace;

function BuyerPanel({ signer, account, provider }) {
  const [listings, setListings] = useState([]);
  const [buyerBalance, setBuyerBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [message, setMessage] = useState(null);

  const getTokenContract = () => new ethers.Contract(
    ENERGY_TOKEN_ADDRESS, EnergyTokenABI.abi, signer
  );

  const getMarketplaceContract = () => new ethers.Contract(
    MARKETPLACE_ADDRESS, MarketplaceABI.abi, signer
  );

  // Fetch all active listings
  const fetchListings = async () => {
    try {
      const marketplaceContract = getMarketplaceContract();
      const activeListings = await marketplaceContract.getActiveListings();

      const formatted = activeListings.map(listing => ({
        id: listing.id.toString(),
        seller: listing.seller,
        amount: listing.amount.toString(),
        pricePerUnit: ethers.formatEther(listing.pricePerUnit),
        totalPrice: ethers.formatEther(
          listing.amount * listing.pricePerUnit
        ),
        totalPriceWei: listing.amount * listing.pricePerUnit
      }));

      setListings(formatted);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    }
  };

  // Fetch buyer's token balance
  const fetchBuyerBalance = async () => {
    try {
      const tokenContract = getTokenContract();
      const bal = await tokenContract.getEnergyBalance(account);
      setBuyerBalance(bal.toString());
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  };

  // Buy energy from a listing
  const handleBuyEnergy = async (listing) => {
    try {
      setLoading(true);
      setLoadingId(listing.id);
      setMessage({ type: 'info', text: `Purchasing ${listing.amount} kWh...` });

      const marketplaceContract = getMarketplaceContract();

      // Send ETH equal to total price
      const tx = await marketplaceContract.buyEnergy(listing.id, {
        value: listing.totalPriceWei
      });

      setMessage({ type: 'info', text: 'Confirming transaction...' });
      await tx.wait();

      setMessage({
        type: 'success',
        text: `✅ Purchased ${listing.amount} kWh for ${listing.totalPrice} ETH!`
      });

      fetchListings();
      fetchBuyerBalance();

    } catch (err) {
      setMessage({ type: 'error', text: `❌ Error: ${err.message}` });
    } finally {
      setLoading(false);
      setLoadingId(null);
    }
  };

  return (
    <div className="panel">
      <h2>🛒 Buy Energy</h2>
      <p className="panel-subtitle">Purchase solar energy tokens from producers</p>

      {/* Buyer Balance */}
      <div className="balance-card">
        <span>Your Energy Token Balance</span>
        <div className="balance-value">
          {buyerBalance !== null ? `${buyerBalance} kWh` : '---'}
        </div>
        <button className="btn-secondary" onClick={fetchBuyerBalance}>
          🔄 Refresh Balance
        </button>
      </div>

      {/* Available Listings */}
      <div className="listings-section">
        <div className="listings-header">
          <h3>Available Energy for Purchase</h3>
          <button className="btn-secondary" onClick={fetchListings}>
            🔄 Refresh Listings
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="no-listings">
            <p>No listings available. Click Refresh to load.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {listings.map(listing => (
              <div key={listing.id} className="listing-card buyer-card">
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
                  Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
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

      {/* Status Message */}
      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default BuyerPanel;