import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import EnergyTokenABI from '../contracts/EnergyToken.json';
import EnergyAuctionABI from '../contracts/EnergyAuction.json';
import addresses from '../contracts/addresses';

function AuctionPanel({ signer, account, provider, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [auctions, setAuctions] = useState([]);
  const [bidAmounts, setBidAmounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const timerRef = useRef(null);

  const getTokenContract = () => new ethers.Contract(addresses.EnergyToken, EnergyTokenABI.abi, signer);
  const getAuctionContract = () => new ethers.Contract(addresses.EnergyAuction, EnergyAuctionABI.abi, signer);

  // Live countdown timer — updates every second
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const fetchAuctions = async () => {
    try {
      const contract = getAuctionContract();
      const active = await contract.getActiveAuctions();
      setAuctions(active.map(a => ({
        id: a.id.toString(),
        seller: a.seller,
        tokenAmount: a.tokenAmount.toString(),
        startingPrice: ethers.formatEther(a.startingPrice),
        startingPriceWei: a.startingPrice,
        endTime: Number(a.endTime),
        highestBidder: a.highestBidder,
        highestBid: ethers.formatEther(a.highestBid),
        highestBidWei: a.highestBid,
        ended: a.ended,
        cancelled: a.cancelled,
        hasBids: a.highestBidder !== '0x0000000000000000000000000000000000000000'
      })));
    } catch (err) { console.error('Fetch auctions error:', err); }
  };

  useEffect(() => {
    if (!provider) return;
    fetchAuctions();
    const contract = new ethers.Contract(addresses.EnergyAuction, EnergyAuctionABI.abi, provider);
    contract.on('AuctionCreated', fetchAuctions);
    contract.on('BidPlaced', fetchAuctions);
    contract.on('AuctionEnded', fetchAuctions);
    contract.on('AuctionCancelled', fetchAuctions);
    return () => contract.removeAllListeners();
  }, [provider]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return 'EXPIRED';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getTimerClass = (endTime) => {
    const remaining = endTime - now;
    if (remaining <= 0) return 'timer-expired';
    if (remaining <= 60) return 'timer-critical';
    if (remaining <= 300) return 'timer-warning';
    return 'timer-safe';
  };

  const handleCreateAuction = async () => {
    if (!amount || !startPrice || !duration || amount <= 0 || startPrice <= 0 || duration <= 0) {
      toast.error('Please fill all fields with valid values');
      return;
    }
    try {
      setLoading(true);
      const tokenContract = getTokenContract();
      const auctionContract = getAuctionContract();

      toast.loading('Step 1/2: Approving tokens...', { id: 'auction-create' });
      const approveTx = await tokenContract.approve(addresses.EnergyAuction, ethers.parseUnits(amount, 18));
      await approveTx.wait();

      toast.loading('Step 2/2: Creating auction...', { id: 'auction-create' });
      const createTx = await auctionContract.createAuction(
        amount,
        ethers.parseEther(startPrice),
        duration
      );
      await createTx.wait();

      toast.success(`Auction created! ${amount} kWh starting at ${startPrice} ETH`, { id: 'auction-create' });
      setAmount(''); setStartPrice(''); setDuration('');
      fetchAuctions();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.reason || err.message.slice(0, 60), { id: 'auction-create' });
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (auction) => {
    const bidAmount = bidAmounts[auction.id];
    if (!bidAmount || Number(bidAmount) <= 0) {
      toast.error('Please enter a bid amount');
      return;
    }
    const bidWei = ethers.parseEther(bidAmount);
    if (bidWei <= auction.highestBidWei) {
      toast.error(`Bid must be higher than ${auction.highestBid} ETH`);
      return;
    }
    if (bidWei < auction.startingPriceWei) {
      toast.error(`Bid must be at least ${auction.startingPrice} ETH`);
      return;
    }
    try {
      setLoading(true);
      setLoadingId(`bid-${auction.id}`);
      const contract = getAuctionContract();
      toast.loading(`Placing bid of ${bidAmount} ETH...`, { id: 'bid' });
      const tx = await contract.placeBid(auction.id, { value: bidWei });
      await tx.wait();
      toast.success(`Bid placed: ${bidAmount} ETH on auction #${auction.id}!`, { id: 'bid' });
      setBidAmounts(prev => ({ ...prev, [auction.id]: '' }));
      fetchAuctions();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.reason || err.message.slice(0, 60), { id: 'bid' });
    } finally {
      setLoading(false);
      setLoadingId(null);
    }
  };

  const handleEndAuction = async (auctionId) => {
    try {
      setLoading(true);
      setLoadingId(`end-${auctionId}`);
      const contract = getAuctionContract();
      toast.loading('Ending auction...', { id: 'end-auction' });
      const tx = await contract.endAuction(auctionId);
      await tx.wait();
      toast.success(`Auction #${auctionId} finalized!`, { id: 'end-auction' });
      fetchAuctions();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.reason || err.message.slice(0, 60), { id: 'end-auction' });
    } finally {
      setLoading(false);
      setLoadingId(null);
    }
  };

  const handleCancelAuction = async (auctionId) => {
    try {
      setLoading(true);
      setLoadingId(`cancel-${auctionId}`);
      const contract = getAuctionContract();
      toast.loading('Cancelling auction...', { id: 'cancel-auction' });
      const tx = await contract.cancelAuction(auctionId);
      await tx.wait();
      toast.success(`Auction #${auctionId} cancelled!`, { id: 'cancel-auction' });
      fetchAuctions();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.reason || err.message.slice(0, 60), { id: 'cancel-auction' });
    } finally {
      setLoading(false);
      setLoadingId(null);
    }
  };

  const short = (addr) => `${addr.slice(0,6)}...${addr.slice(-4)}`;

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <div className="panel-icon icon-purple">🔨</div>
            Energy Auctions
          </div>
          <div className="panel-subtitle">Create timed auctions or bid on energy tokens</div>
        </div>
        <button className="btn-secondary" onClick={fetchAuctions}>↻ Refresh</button>
      </div>

      {/* Create Auction Form */}
      <div className="auction-form-section">
        <div className="section-title">
          Create New Auction
          <span style={{color: 'var(--purple)', fontFamily: 'Space Mono'}}>seller</span>
        </div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="input-label">Amount (kWh)</label>
            <input type="number" placeholder="e.g. 10" value={amount}
              onChange={(e) => setAmount(e.target.value)} min="1" className="input-field" />
          </div>
          <div className="form-group">
            <label className="input-label">Start Price (ETH)</label>
            <input type="number" placeholder="e.g. 0.01" value={startPrice}
              onChange={(e) => setStartPrice(e.target.value)} min="0" step="0.001" className="input-field" />
          </div>
          <div className="form-group">
            <label className="input-label">Duration (min)</label>
            <input type="number" placeholder="e.g. 5" value={duration}
              onChange={(e) => setDuration(e.target.value)} min="1" max="1440" className="input-field" />
          </div>
        </div>

        <button className="btn-primary purple" onClick={handleCreateAuction} disabled={loading}>
          {loading && !loadingId ? '⏳ Processing...' : '🔨 Create Auction'}
        </button>
      </div>

      {/* Active Auctions */}
      <div className="section-title" style={{marginTop: '28px'}}>
        Active Auctions
        <span style={{color: 'var(--purple)', fontFamily: 'Space Mono'}}>
          {auctions.length} live
        </span>
      </div>

      {auctions.length === 0 ? (
        <p className="no-listings">No active auctions. Create one above!</p>
      ) : (
        <div className="auction-grid">
          {auctions.map(auction => {
            const remaining = auction.endTime - now;
            const isExpired = remaining <= 0;
            const isSeller = auction.seller.toLowerCase() === account.toLowerCase();
            const isHighestBidder = auction.highestBidder.toLowerCase() === account.toLowerCase();

            return (
              <div key={auction.id} className={`auction-card ${isExpired ? 'auction-expired' : ''}`}>
                {/* Header */}
                <div className="auction-card-header">
                  <span className="auction-id">Auction #{auction.id}</span>
                  <span className={`auction-timer ${getTimerClass(auction.endTime)}`}>
                    ⏱ {formatTime(remaining)}
                  </span>
                </div>

                {/* Token Amount */}
                <div className="auction-amount">{auction.tokenAmount} kWh</div>

                {/* Bid Info */}
                <div className="auction-bid-info">
                  <div className="auction-bid-row">
                    <span className="auction-bid-label">Starting Price</span>
                    <span className="auction-bid-value">{auction.startingPrice} ETH</span>
                  </div>
                  <div className="auction-bid-row">
                    <span className="auction-bid-label">Highest Bid</span>
                    <span className="auction-bid-value highlight">
                      {auction.hasBids ? `${auction.highestBid} ETH` : 'No bids yet'}
                    </span>
                  </div>
                  {auction.hasBids && (
                    <div className="auction-bid-row">
                      <span className="auction-bid-label">Leading</span>
                      <span className={`auction-bid-value ${isHighestBidder ? 'you-winning' : ''}`}>
                        {isHighestBidder ? '🏆 You!' : short(auction.highestBidder)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Seller */}
                <div className="auction-seller">
                  Seller: {isSeller ? 'You' : short(auction.seller)}
                </div>

                {/* Actions */}
                {isExpired ? (
                  <button
                    className="btn-auction-end"
                    onClick={() => handleEndAuction(auction.id)}
                    disabled={loading}
                  >
                    {loadingId === `end-${auction.id}` ? '⏳ Finalizing...' : '🏁 End Auction'}
                  </button>
                ) : isSeller ? (
                  !auction.hasBids ? (
                    <button
                      className="btn-cancel"
                      onClick={() => handleCancelAuction(auction.id)}
                      disabled={loading}
                    >
                      {loadingId === `cancel-${auction.id}` ? '⏳ Cancelling...' : '✕ Cancel Auction'}
                    </button>
                  ) : (
                    <div className="own-listing-badge" style={{background:'rgba(138,92,246,0.08)', borderColor:'rgba(138,92,246,0.2)', color:'var(--purple)'}}>
                      Your Auction — Bids Active
                    </div>
                  )
                ) : (
                  <div className="auction-bid-section">
                    <input
                      type="number"
                      placeholder={auction.hasBids ? `> ${auction.highestBid}` : `≥ ${auction.startingPrice}`}
                      value={bidAmounts[auction.id] || ''}
                      onChange={(e) => setBidAmounts(prev => ({...prev, [auction.id]: e.target.value}))}
                      step="0.001"
                      min="0"
                      className="input-field bid-input"
                    />
                    <button
                      className="btn-bid"
                      onClick={() => handlePlaceBid(auction)}
                      disabled={loading}
                    >
                      {loadingId === `bid-${auction.id}` ? '⏳' : '💰 Bid'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AuctionPanel;
