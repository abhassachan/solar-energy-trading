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

  return { energyToken, marketplace, energyAuction };
});

export default DeployModule;