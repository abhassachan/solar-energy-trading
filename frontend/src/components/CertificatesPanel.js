import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import EnergyCertificateABI from '../contracts/EnergyCertificate.json';
import addresses from '../contracts/addresses';

function CertificatesPanel({ provider, account }) {
  const [certificates, setCertificates] = useState([]);
  const [totalImpact, setTotalImpact] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCertificates = useCallback(async () => {
    if (!provider || !account || !addresses.EnergyCertificate) return;
    try {
      setLoading(true);
      const contract = new ethers.Contract(addresses.EnergyCertificate, EnergyCertificateABI.abi, provider);
      
      const filter = contract.filters.CertificateMinted(null, account);
      const events = await contract.queryFilter(filter, 0, 'latest');
      
      const certs = [];
      let totalKwh = 0;

      for (let event of events) {
        const tokenId = event.args[0];
        
        try {
          const currentOwner = await contract.ownerOf(tokenId);
          if (currentOwner.toLowerCase() === account.toLowerCase()) {
            const uri = await contract.tokenURI(tokenId);
            const base64Json = uri.split(',')[1];
            const jsonString = atob(base64Json);
            const metadata = JSON.parse(jsonString);
            
            certs.push({
              id: tokenId.toString(),
              name: metadata.name,
              description: metadata.description,
              image: metadata.image,
              attributes: metadata.attributes
            });

            // Calculate impact
            const amtAttr = metadata.attributes.find(a => a.trait_type === "Amount (kWh)");
            if (amtAttr) {
              totalKwh += parseInt(amtAttr.value) || 0;
            }
          }
        } catch (e) {
          console.error("Token no longer exists", tokenId.toString());
        }
      }
      
      setTotalImpact(totalKwh);
      setCertificates(certs.reverse());
    } catch (err) {
      console.error("Error fetching certificates:", err);
    } finally {
      setLoading(false);
    }
  }, [provider, account]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  if (loading) {
    return <div className="loading-state">Loading your certificates...</div>;
  }

  const getTierColor = (tier) => {
    switch(tier) {
      case 'Bronze': return 'rgba(0, 255, 136, 0.2)';
      case 'Silver': return 'rgba(226, 232, 240, 0.2)';
      case 'Gold': return 'rgba(255, 215, 0, 0.2)';
      case 'Diamond': return 'rgba(56, 189, 248, 0.2)';
      default: return 'var(--border)';
    }
  };

  const getTierTextColor = (tier) => {
    switch(tier) {
      case 'Bronze': return '#00ff88';
      case 'Silver': return '#e2e8f0';
      case 'Gold': return '#ffd700';
      case 'Diamond': return '#38bdf8';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="panel gamified">
      <div className="impact-hero">
        <div className="impact-card">
          <div className="impact-icon">⚡</div>
          <div className="impact-stats">
            <div className="impact-value">{totalImpact} <span>kWh</span></div>
            <div className="impact-label">Total Green Energy Supported</div>
          </div>
        </div>
        <div className="impact-card">
          <div className="impact-icon">🏆</div>
          <div className="impact-stats">
            <div className="impact-value">{certificates.length}</div>
            <div className="impact-label">Certificates Collected</div>
          </div>
        </div>
      </div>

      <div className="panel-header" style={{marginTop: '2rem'}}>
        <div>
          <div className="panel-title">
            <div className="panel-icon icon-yellow" style={{background: 'rgba(255, 215, 0, 0.1)'}}>🎖️</div>
            My Collection
          </div>
          <div className="panel-subtitle">Official On-Chain Proof of Green Energy</div>
        </div>
      </div>

      {certificates.length === 0 ? (
        <p className="no-listings">You don't have any certificates yet. Buy energy in the Marketplace or win an Auction to earn one!</p>
      ) : (
        <div className="certificate-grid">
          {certificates.map(cert => {
            const tierAttr = cert.attributes.find(a => a.trait_type === "Tier")?.value || "Standard";
            return (
              <div key={cert.id} className="certificate-card">
                 <div className="certificate-img-container gamified-img">
                   <img src={cert.image} alt={cert.name} className="certificate-img" />
                 </div>
                 
                 <div className="certificate-info">
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                     <h4>{cert.name}</h4>
                     <span className="tier-badge" style={{background: getTierColor(tierAttr), color: getTierTextColor(tierAttr)}}>
                       {tierAttr}
                     </span>
                   </div>
                   <div className="cert-attrs">
                     {cert.attributes.map((attr, idx) => {
                       if (attr.trait_type === "Tier") return null;
                       return (
                         <div key={idx} className="cert-attr">
                            <span className="attr-label">{attr.trait_type}</span>
                            {attr.display_type === 'date' 
                              ? <span className="attr-value">{new Date(Number(attr.value)*1000).toLocaleDateString()}</span>
                              : <span className="attr-value">{attr.value}</span>
                            }
                         </div>
                       );
                     })}
                   </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CertificatesPanel;
