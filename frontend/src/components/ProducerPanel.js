import { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import EnergyTokenABI from '../contracts/EnergyToken.json';
import addresses from '../contracts/addresses';

function ProducerPanel({ signer, account, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getContract = () => new ethers.Contract(
    addresses.EnergyToken, EnergyTokenABI.abi, signer
  );

  const handleGenerateEnergy = async () => {
    if (!amount || amount <= 0) {
      setErrorMsg('Please enter a valid positive amount (e.g. 10)');
      toast.error('Please enter a valid amount');
      return;
    }
    setErrorMsg('');
    try {
      setLoading(true);
      toast.loading('Confirm in MetaMask...', { id: 'mint' });
      const contract = getContract();
      const tx = await contract.generateEnergy(amount);
      toast.loading('Mining transaction...', { id: 'mint' });
      await tx.wait();
      toast.success(`Minted ${amount} kWh tokens!`, { id: 'mint' });
      setAmount('');
      fetchBalance();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.reason || err.message.slice(0, 60), { id: 'mint' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const contract = getContract();
      const bal = await contract.getEnergyBalance(account);
      setBalance(bal.toString());
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <div className="panel-icon icon-green">⚡</div>
            Producer Dashboard
          </div>
          <div className="panel-subtitle">Mint tokens for your surplus solar energy</div>
        </div>
        <button className="btn-secondary" onClick={fetchBalance}>↻ Refresh</button>
      </div>

      {/* Balance Card */}
      <div className="balance-card" data-icon="⚡">
        <div className="balance-label">Your Energy Balance</div>
        <div className="balance-value">{balance !== null ? `${balance} kWh` : '---'}</div>
        <div className="balance-sub">EnergyToken (ENRG) • 1 token = 1 kWh</div>
      </div>

      {/* Form */}
      <div className="form-group">
        <label className="input-label">Surplus Energy to Mint (kWh)</label>
        <input
          type="number"
          placeholder="e.g. 10"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (e.target.value > 0) setErrorMsg('');
          }}
          min="1"
          className={`input-field ${errorMsg ? 'input-error' : ''}`}
          style={errorMsg ? { border: '1px solid #ff4444' } : {}}
        />
        {errorMsg && <div style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>{errorMsg}</div>}
      </div>

      <button
        className="btn-primary"
        onClick={handleGenerateEnergy}
        disabled={loading}
      >
        {loading ? '⏳ Processing...' : '⚡ Generate Energy Tokens'}
      </button>
    </div>
  );
}

export default ProducerPanel;