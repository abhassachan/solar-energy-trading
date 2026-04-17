import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import MarketplaceABI from '../contracts/Marketplace.json';
import addresses from '../contracts/addresses';

function TransactionHistory({ provider }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!provider) return;
    try {
      setLoading(true);
      toast.loading('Fetching blockchain history...', { id: 'history' });
      const marketplace = new ethers.Contract(addresses.Marketplace, MarketplaceABI.abi, provider);
      const filter = marketplace.filters.EnergyPurchased();
      const events = await marketplace.queryFilter(filter, 0, 'latest');
      const formatted = await Promise.all(events.map(async (event) => {
        const block = await provider.getBlock(event.blockNumber);
        return {
          txHash: event.transactionHash,
          listingId: event.args[0].toString(),
          buyer: event.args[1],
          seller: event.args[2],
          amount: event.args[3].toString(),
          totalPrice: ethers.formatEther(event.args[4]),
          timestamp: new Date(block.timestamp * 1000).toLocaleString(),
          blockNumber: event.blockNumber
        };
      }));
      setTransactions(formatted.reverse());
      toast.success(`Loaded ${formatted.length} transactions`, { id: 'history' });
    } catch (err) {
      toast.error('Failed to fetch history', { id: 'history' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  const short = (addr) => `${addr.slice(0,6)}...${addr.slice(-4)}`;

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <div className="panel-icon icon-yellow">📜</div>
            Transaction History
          </div>
          <div className="panel-subtitle">All completed P2P energy trades — immutably recorded on blockchain</div>
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
                  <tr key={tx.txHash}>
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