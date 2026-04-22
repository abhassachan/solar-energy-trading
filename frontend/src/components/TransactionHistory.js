import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import MarketplaceABI from '../contracts/Marketplace.json';
import EnergyAuctionABI from '../contracts/EnergyAuction.json';
import addresses from '../contracts/addresses';

function TransactionHistory({ provider }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!provider) return;
    try {
      setLoading(true);
      toast.loading('Fetching blockchain history...', { id: 'history' });
      
      const allTx = [];

      // Fetch marketplace purchase events
      const marketplace = new ethers.Contract(addresses.Marketplace, MarketplaceABI.abi, provider);
      const purchaseFilter = marketplace.filters.EnergyPurchased();
      const purchaseEvents = await marketplace.queryFilter(purchaseFilter, 0, 'latest');
      
      for (const event of purchaseEvents) {
        const block = await provider.getBlock(event.blockNumber);
        allTx.push({
          txHash: event.transactionHash,
          type: 'purchase',
          listingId: event.args[0].toString(),
          buyer: event.args[1],
          seller: event.args[2],
          amount: event.args[3].toString(),
          totalPrice: ethers.formatEther(event.args[4]),
          timestamp: new Date(block.timestamp * 1000).toLocaleString(),
          blockNumber: event.blockNumber,
          blockTimestamp: block.timestamp
        });
      }

      // Fetch auction ended events
      if (addresses.EnergyAuction) {
        const auction = new ethers.Contract(addresses.EnergyAuction, EnergyAuctionABI.abi, provider);
        const auctionFilter = auction.filters.AuctionEnded();
        const auctionEvents = await auction.queryFilter(auctionFilter, 0, 'latest');

        for (const event of auctionEvents) {
          const block = await provider.getBlock(event.blockNumber);
          const winner = event.args[1];
          // Skip auctions with no winner (no bids)
          if (winner === '0x0000000000000000000000000000000000000000') continue;
          
          allTx.push({
            txHash: event.transactionHash,
            type: 'auction',
            listingId: `A-${event.args[0].toString()}`,
            buyer: winner,
            seller: '—', // seller info not in the event, shown as auction
            amount: event.args[2].toString(),
            totalPrice: ethers.formatEther(event.args[3]),
            timestamp: new Date(block.timestamp * 1000).toLocaleString(),
            blockNumber: event.blockNumber,
            blockTimestamp: block.timestamp
          });
        }
      }

      // Sort by block timestamp (newest first)
      allTx.sort((a, b) => b.blockTimestamp - a.blockTimestamp);

      setTransactions(allTx);
      toast.success(`Loaded ${allTx.length} transactions`, { id: 'history' });
    } catch (err) {
      toast.error('Failed to fetch history', { id: 'history' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  const short = (addr) => {
    if (addr === '—') return '—';
    return `${addr.slice(0,6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <div className="panel-icon icon-yellow">📜</div>
            Transaction History
          </div>
          <div className="panel-subtitle">All completed energy trades — fixed-price & auctions — on blockchain</div>
        </div>
        <button className="btn-secondary" onClick={fetchHistory} disabled={loading}>
          {loading ? '⏳ Loading...' : '↻ Load History'}
        </button>
      </div>

      {transactions.length === 0 ? (
        <p className="no-listings">
          Click "Load History" to fetch all transactions from the blockchain
        </p>
      ) : (
        <>
          <div className="tx-table-wrapper">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Price</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.txHash + tx.listingId}>
                    <td>
                      {tx.type === 'auction' ? (
                        <span className="type-badge auction-badge">🔨 Auction</span>
                      ) : (
                        <span className="type-badge purchase-badge">🛒 Direct</span>
                      )}
                    </td>
                    <td className="tx-id">#{tx.listingId}</td>
                    <td className="tx-amount">{tx.amount} kWh</td>
                    <td className="tx-price">{tx.totalPrice} ETH</td>
                    <td className="tx-address">{short(tx.buyer)}</td>
                    <td className="tx-address">{short(tx.seller)}</td>
                    <td>
                      <span className="status-badge">
                        <div className="dot" />
                        Confirmed
                      </span>
                    </td>
                    <td className="tx-time">{tx.timestamp}</td>
                    <td>
                      <span className="tx-hash" title={tx.txHash}>
                        {tx.txHash.slice(0,10)}...
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tx-count">
            Total trades: <strong style={{color:'var(--accent)'}}>{transactions.length}</strong>
          </p>
        </>
      )}
    </div>
  );
}

export default TransactionHistory;