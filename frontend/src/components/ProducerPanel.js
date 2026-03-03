import { useState } from 'react';
import { ethers } from 'ethers';

// We need the contract ABI and address
import EnergyTokenABI from '../contracts/EnergyToken.json';

const ENERGY_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function ProducerPanel({ signer, account }) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Get contract instance
  const getContract = () => {
    return new ethers.Contract(
      ENERGY_TOKEN_ADDRESS,
      EnergyTokenABI.abi,
      signer
    );
  };

  // Generate energy tokens
  const handleGenerateEnergy = async () => {
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Confirming transaction...' });

      const contract = getContract();
      const tx = await contract.generateEnergy(amount);

      setMessage({ type: 'info', text: 'Mining transaction...' });
      await tx.wait(); // Wait for blockchain confirmation

      setMessage({ type: 'success', text: `✅ Successfully minted ${amount} kWh tokens!` });
      setAmount('');
      fetchBalance(); // Refresh balance

    } catch (err) {
      setMessage({ type: 'error', text: `❌ Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Fetch current token balance
  const fetchBalance = async () => {
    try {
      const contract = getContract();
      const bal = await contract.getEnergyBalance(account);
      setBalance(bal.toString());
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  };

  return (
    <div className="panel">
      <h2>⚡ Producer Dashboard</h2>
      <p className="panel-subtitle">Generate tokens for your surplus solar energy</p>

      {/* Balance Display */}
      <div className="balance-card">
        <span>Your Energy Balance</span>
        <div className="balance-value">
          {balance !== null ? `${balance} kWh` : '---'}
        </div>
        <button className="btn-secondary" onClick={fetchBalance}>
          🔄 Refresh Balance
        </button>
      </div>

      {/* Generate Energy Form */}
      <div className="form-group">
        <label>Amount of surplus energy (kWh)</label>
        <input
          type="number"
          placeholder="e.g. 10"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
          className="input-field"
        />
        <button
          className="btn-primary"
          onClick={handleGenerateEnergy}
          disabled={loading}
        >
          {loading ? '⏳ Processing...' : '⚡ Generate Energy Tokens'}
        </button>
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

export default ProducerPanel; 