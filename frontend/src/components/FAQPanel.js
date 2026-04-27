import React from 'react';

function FAQPanel() {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <div className="panel-icon icon-blue">📘</div>
            How it Works
          </div>
          <div className="panel-subtitle">Guide to using the SolarTrade platform</div>
        </div>
      </div>

      <div className="faq-section" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="faq-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', borderLeft: '3px solid #00ff88' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e8f4f8' }}>1. Minting Energy Tokens</h3>
          <p style={{ margin: 0, color: '#8b949e', lineHeight: '1.5' }}>
            If you are a solar producer with surplus energy, you can generate Energy Tokens (ENRG) in the <strong>Producer</strong> tab. 1 ENRG represents 1 kWh of solar energy. Once minted, these tokens belong to your wallet and can be traded.
          </p>
        </div>

        <div className="faq-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', borderLeft: '3px solid #ffaa00' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e8f4f8' }}>2. Selling on the Marketplace</h3>
          <p style={{ margin: 0, color: '#8b949e', lineHeight: '1.5' }}>
            Navigate to the <strong>Marketplace</strong> tab to list your energy tokens for sale. You specify the amount you want to sell and the price per unit in ETH. Buyers can purchase partial or full amounts from your listing.
          </p>
        </div>

        <div className="faq-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', borderLeft: '3px solid #00bbff' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e8f4f8' }}>3. Buying Energy</h3>
          <p style={{ margin: 0, color: '#8b949e', lineHeight: '1.5' }}>
            In the <strong>Buy Energy</strong> tab, you can browse active listings from producers. You can purchase the exact amount of kWh you need. The corresponding ETH will be transferred to the seller, and the ENRG tokens to you.
          </p>
        </div>

        <div className="faq-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', borderLeft: '3px solid #ff4444' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e8f4f8' }}>4. Energy Auctions</h3>
          <p style={{ margin: 0, color: '#8b949e', lineHeight: '1.5' }}>
            Instead of fixed prices, you can auction bulk energy in the <strong>Auctions</strong> tab. Set a starting price and duration. Buyers place bids, and the highest bidder wins the tokens when the auction concludes.
          </p>
        </div>

        <div className="faq-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', borderLeft: '3px solid #b700ff' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e8f4f8' }}>5. Green Impact Certificates</h3>
          <p style={{ margin: 0, color: '#8b949e', lineHeight: '1.5' }}>
            Active traders are automatically rewarded with dynamic Green Impact NFT Certificates. These certificates evolve based on your total traded volume, visually proving your commitment to renewable energy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default FAQPanel;
