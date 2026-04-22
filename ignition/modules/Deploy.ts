import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deployment module for the Solar Energy Trading Platform
 * Deploys EnergyToken first, then Marketplace and EnergyAuction with EnergyToken's address
 */
const DeployModule = buildModule("DeployModule", (m) => {
  
  // Step 1: Deploy EnergyToken contract
  const energyToken = m.contract("EnergyToken");

  // Step 2: Deploy Marketplace, passing EnergyToken's address as constructor argument
  const marketplace = m.contract("Marketplace", [energyToken]);

  // Step 3: Deploy EnergyAuction, passing EnergyToken's address as constructor argument
  const energyAuction = m.contract("EnergyAuction", [energyToken]);

  // Step 4: Deploy EnergyCertificate
  const energyCertificate = m.contract("EnergyCertificate");

  // Step 5: Link the certificate contract to the trading contracts
  m.call(marketplace, "setCertificateContract", [energyCertificate]);
  m.call(energyAuction, "setCertificateContract", [energyCertificate]);

  // Step 6: Authorize trading contracts to mint certificates
  m.call(energyCertificate, "setAuthorizedMinter", [marketplace, true], { id: "authMarketplace" });
  m.call(energyCertificate, "setAuthorizedMinter", [energyAuction, true], { id: "authAuction" });

  return { energyToken, marketplace, energyAuction, energyCertificate };
});

export default DeployModule;