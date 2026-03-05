import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import MarketplaceABI from '../contracts/Marketplace.json';
import addresses from '../contracts/addresses';

function TransactionHistory({ provider }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!provider) return;

    try {
      setLoading(true);

      const marketplace = new ethers.Contract(
        addresses.Marketplace,
        MarketplaceABI.abi,
        provider
      );

      // Query all EnergyPurchased events from block 0 to now
      const filter = marketplace.filters.EnergyPurchased();
      const events = await marketplace.queryFilter(filter, 0, 'latest');

      const formatted = await Promise.all(events.map(async (event) => {
        // Get block timestamp
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

      // Most recent first
      setTransactions(formatted.reverse());

    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  const shortAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="panel">
      <div className="listings-header">
        <h2>📜 Transaction History</h2>
        <button
          className="btn-secondary"
          onClick={fetchHistory}
          disabled={loading}
        >
          {loading ? '⏳ Loading...' : '🔄 Load History'}
        </button>
      </div>
      <p className="panel-subtitle">All completed energy trades on the blockchain</p>

      {transactions.length === 0 ? (
        <p className="no-listings">
          {loading ? 'Fetching from blockchain...' : 'Click "Load History" to fetch transactions'}
        </p>
      ) : (
        <div className="tx-table-wrapper">
          <table className="tx-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Amount</th>
                <th>Price</th>
                <th>Buyer</th>
                <th>Seller</th>
                <th>Time</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr key={tx.txHash}>
                  <td className="tx-id">#{tx.listingId}</td>
                  <td className="tx-amount">{tx.amount} kWh</td>
                  <td className="tx-price">{tx.totalPrice} ETH</td>
                  <td className="tx-address">{shortAddress(tx.buyer)}</td>
                  <td className="tx-address">{shortAddress(tx.seller)}</td>
                  <td className="tx-time">{tx.timestamp}</td>
                  <td>
                    <span className="tx-hash" title={tx.txHash}>
                      {tx.txHash.slice(0, 8)}...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="tx-count">
            Total trades: <strong>{transactions.length}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default TransactionHistory;