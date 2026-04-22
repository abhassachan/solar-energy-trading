import fs from 'fs';
import path from 'path';

// Read the latest deployment
const deploymentDir = './ignition/deployments/chain-31337/artifacts';
const addressFile = './ignition/deployments/chain-31337/deployed_addresses.json';

const addresses = JSON.parse(fs.readFileSync(addressFile, 'utf8'));

const output = `const addresses = {
  EnergyToken: "${addresses['DeployModule#EnergyToken']}",
  Marketplace: "${addresses['DeployModule#Marketplace']}",
  EnergyAuction: "${addresses['DeployModule#EnergyAuction']}",
  EnergyCertificate: "${addresses['DeployModule#EnergyCertificate']}"
};

export default addresses;
`;

fs.writeFileSync('./frontend/src/contracts/addresses.js', output);
console.log('✅ Addresses updated!');
console.log('EnergyToken:', addresses['DeployModule#EnergyToken']);
console.log('Marketplace:', addresses['DeployModule#Marketplace']);
console.log('EnergyAuction:', addresses['DeployModule#EnergyAuction']);
console.log('EnergyCertificate:', addresses['DeployModule#EnergyCertificate']);