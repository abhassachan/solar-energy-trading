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
  const [buyAmounts, setBuyAmounts] = useState({});
  const [sortBy, setSortBy] = useState('newest');

  const getTokenContract = () => new ethers.Contract(addresses.EnergyToken, EnergyTokenABI.abi, signer);
  const getMarketplaceContract = () => new ethers.Contract(addresses.Marketplace, MarketplaceABI.abi, signer);

  const fetchListings = async () => {
    try {
      const contract = getMarketplaceContract();
      const active = await contract.getActiveListings();
      setListings(active.map(l => ({
        id: l.id.toString(),
        seller: l.seller,
        amount: Number(l.amount.toString()),
        pricePerUnit: ethers.formatEther(l.pricePerUnit),
        pricePerUnitWei: l.pricePerUnit,
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

  const getBuyAmount = (listing) => {
    const val = buyAmounts[listing.id];
    if (val === undefined || val === '') return listing.amount;
    return Number(val);
  };

  const getCalculatedPrice = (listing) => {
    const amt = getBuyAmount(listing);
    if (amt <= 0 || amt > listing.amount) return '—';
    const priceWei = ethers.toBigInt(amt) * listing.pricePerUnitWei;
    return ethers.formatEther(priceWei);
  };

  const handleBuyEnergy = async (listing) => {
    const amountToBuy = getBuyAmount(listing);
    if (amountToBuy <= 0 || amountToBuy > listing.amount) {
      toast.error(`Enter a valid amount (1-${listing.amount} kWh)`);
      return;
    }
    try {
      setLoading(true);
      setLoadingId(listing.id);
      const contract = getMarketplaceContract();
      const costWei = ethers.toBigInt(amountToBuy) * listing.pricePerUnitWei;
      toast.loading(`Buying ${amountToBuy} kWh...`, { id: 'buy' });
      const tx = await contract.buyEnergy(listing.id, amountToBuy, { value: costWei });
      await tx.wait();
      const costEth = ethers.formatEther(costWei);
      toast.success(`Purchased ${amountToBuy} kWh for ${costEth} ETH!`, { id: 'buy' });
      setBuyAmounts(prev => ({ ...prev, [listing.id]: '' }));
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

  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === 'lowest_price') {
      return Number(a.pricePerUnit) - Number(b.pricePerUnit);
    } else if (sortBy === 'highest_amount') {
      return b.amount - a.amount;
    }
    return Number(b.id) - Number(a.id);
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <div className="panel-icon icon-orange">🛒</div>
            Buy Energy
          </div>
          <div className="panel-subtitle">Purchase solar energy tokens — buy full or partial amounts</div>
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
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          Available Energy
          <span style={{color: 'var(--accent)', fontFamily: 'Space Mono', marginLeft: '10px'}}>
            {listings.length} available
          </span>
        </div>
        <select 
          className="input-field" 
          style={{ width: 'auto', padding: '0.4rem 1rem', marginBottom: '0', fontSize: '0.9rem', backgroundColor: '#16202c', color: '#e8f4f8', border: '1px solid #1e2d3d', borderRadius: '4px' }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="lowest_price">Lowest Price</option>
          <option value="highest_amount">Highest Amount</option>
        </select>
      </div>

      {listings.length === 0 ? (
        <p className="no-listings">No energy available. Check back soon!</p>
      ) : (
        <div className="listings-grid">
          {sortedListings.map(listing => {
            const buyAmt = getBuyAmount(listing);
            const isPartial = buyAmounts[listing.id] !== undefined && buyAmounts[listing.id] !== '' && Number(buyAmounts[listing.id]) < listing.amount;
            
            return (
              <div key={listing.id} className="listing-card">
                <div className="listing-top">
                  <span className="listing-id">#{listing.id}</span>
                  <span className="listing-amount">{listing.amount} kWh</span>
                </div>
                <div className="listing-price">{listing.pricePerUnit} ETH/kWh</div>
                <div className="listing-seller">
                  Seller: {listing.seller.slice(0,6)}...{listing.seller.slice(-4)}
                </div>
                {listing.seller.toLowerCase() === account.toLowerCase() ? (
                  <div className="own-listing-badge">Your Listing</div>
                ) : (
                  <>
                    {/* Partial purchase input */}
                    <div className="partial-buy-section">
                      <label className="input-label">Amount to Buy (kWh)</label>
                      <input
                        type="number"
                        placeholder={`Max ${listing.amount}`}
                        value={buyAmounts[listing.id] || ''}
                        onChange={(e) => setBuyAmounts(prev => ({...prev, [listing.id]: e.target.value}))}
                        min="1"
                        max={listing.amount}
                        className="input-field partial-input"
                      />
                      <div className="partial-cost">
                        Cost: <strong>{getCalculatedPrice(listing)} ETH</strong>
                        {isPartial && <span className="partial-badge">Partial</span>}
                      </div>
                    </div>
                    <button
                      className="btn-buy"
                      onClick={() => handleBuyEnergy(listing)}
                      disabled={loading}
                    >
                      {loadingId === listing.id ? '⏳ Buying...' : `⚡ Buy ${buyAmt} kWh`}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BuyerPanel;