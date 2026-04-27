import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import MarketplaceABI from '../contracts/Marketplace.json';
import EnergyTokenABI from '../contracts/EnergyToken.json';
import addresses from '../contracts/addresses';

function ImpactPanel({ provider, account }) {
  const [chartData, setChartData] = useState([]);
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [totalOffset, setTotalOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  // 1 kWh = roughly 0.4 kg of CO2 offset
  const CO2_PER_KWH = 0.4;

  const fetchImpactData = useCallback(async () => {
    if (!provider || !account) return;
    try {
      setLoading(true);
      const marketplace = new ethers.Contract(addresses.Marketplace, MarketplaceABI.abi, provider);
      
      // Fetch all purchases where the current user is the seller
      const filter = marketplace.filters.EnergyPurchased(null, null, account);
      const events = await marketplace.queryFilter(filter, 0, 'latest');

      let cumulativeKwh = 0;
      const dataPoints = [];

      for (const event of events) {
        const block = await provider.getBlock(event.blockNumber);
        const amountKwh = Number(event.args[3].toString());
        cumulativeKwh += amountKwh;

        const date = new Date(block.timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        dataPoints.push({
          date: date,
          co2Offset: parseFloat((cumulativeKwh * CO2_PER_KWH).toFixed(2)),
          timestamp: block.timestamp
        });
      }

      // Sort chronologically just in case
      dataPoints.sort((a, b) => a.timestamp - b.timestamp);

      // Aggregate same-day transactions into a single point
      const aggregatedData = [];
      const dateMap = new Map();

      dataPoints.forEach(point => {
        dateMap.set(point.date, point.co2Offset); // Always keeps the highest cumulative value for that day
      });

      dateMap.forEach((offset, date) => {
        aggregatedData.push({ date, 'CO2 Offset (kg)': offset });
      });

      // Fetch EnergyGenerated (Minted) events
      const tokenContract = new ethers.Contract(addresses.EnergyToken, EnergyTokenABI.abi, provider);
      const mintFilter = tokenContract.filters.EnergyGenerated(account);
      const mintEvents = await tokenContract.queryFilter(mintFilter, 0, 'latest');
      
      let totalMinted = 0;
      mintEvents.forEach(e => {
        totalMinted += Number(e.args[1].toString());
      });

      setEfficiencyData([
        {
          name: 'Total Energy (kWh)',
          Produced: totalMinted,
          Distributed: cumulativeKwh
        }
      ]);

      setTotalOffset((cumulativeKwh * CO2_PER_KWH).toFixed(2));
      setChartData(aggregatedData);
    } catch (err) {
      console.error('Failed to fetch impact data:', err);
    } finally {
      setLoading(false);
    }
  }, [provider, account]);

  useEffect(() => {
    fetchImpactData();
  }, [fetchImpactData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'rgba(13,17,23,0.9)', padding: '10px', border: '1px solid #1e2d3d', borderRadius: '4px', color: '#e8f4f8' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#8b949e' }}>{label}</p>
          <p style={{ margin: '5px 0 0', fontWeight: 'bold', color: '#00ff88' }}>
            {payload[0].value} kg CO2 Avoided
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <div className="panel-icon icon-green">🌍</div>
            My Green Impact
          </div>
          <div className="panel-subtitle">Track the environmental difference you've made by providing solar energy.</div>
        </div>
        <button className="btn-secondary" onClick={fetchImpactData}>↻ Refresh</button>
      </div>

      <div className="balance-card" data-icon="🌍" style={{ marginBottom: '2rem' }}>
        <div className="balance-label">Total CO2 Emissions Prevented</div>
        <div className="balance-value" style={{ color: '#00ff88' }}>
          {totalOffset} <span style={{ fontSize: '1.2rem', color: '#8b949e' }}>kg</span>
        </div>
        <div className="balance-sub">Calculated based on your total sold solar energy</div>
      </div>

      <div className="section-title">
        Carbon Offset Tracker
      </div>

      <div style={{ width: '100%', height: 400, marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '20px 20px 0 0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>
            Loading impact data...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>
            Sell some energy on the marketplace to see your impact grow!
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
              <XAxis dataKey="date" stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="CO2 Offset (kg)" 
                stroke="#00ff88" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCo2)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="section-title" style={{ marginTop: '3rem' }}>
        Energy Produced vs. Distributed
      </div>
      <div className="panel-subtitle" style={{ marginBottom: '1rem' }}>
        Compare how much energy you've minted against how much you've successfully sold to the network.
      </div>

      <div style={{ width: '100%', height: 300, background: 'rgba(255,255,255,0.02)', padding: '20px 20px 0 0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>
            Loading impact data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={efficiencyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barGap={20} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
              <XAxis dataKey="name" stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 14 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#8b949e" tick={{ fill: '#8b949e', fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(13,17,23,0.9)', border: '1px solid #1e2d3d', borderRadius: '4px', color: '#e8f4f8' }} itemStyle={{ fontWeight: 'bold' }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#8b949e' }} />
              <Bar dataKey="Produced" fill="#1e90ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Distributed" fill="#00ff88" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default ImpactPanel;
