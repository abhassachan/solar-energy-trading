import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deployment module for the Solar Energy Trading Platform
 * Deploys EnergyToken first, then Marketplace with EnergyToken's address
 */
const DeployModule = buildModule("DeployModule", (m) => {
  
  // Step 1: Deploy EnergyToken contract
  const energyToken = m.contract("EnergyToken");

  // Step 2: Deploy Marketplace, passing EnergyToken's address as constructor argument
  const marketplace = m.contract("Marketplace", [energyToken]);

  return { energyToken, marketplace };
});

export default DeployModule;