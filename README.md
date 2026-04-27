# SolarTrade DApp

**SolarTrade** is a decentralized peer-to-peer energy trading platform. It empowers solar energy producers to tokenize their surplus energy and sell it directly to consumers via a secure, transparent blockchain marketplace.

## Key Features

- **Energy Tokenization:** Mint ENRG tokens representing 1 kWh of surplus solar energy.
- **P2P Marketplace:** List energy for sale at fixed prices or purchase from other producers without intermediaries.
- **Energy Auctions:** Create and manage timed auctions for bulk energy sales to the highest bidder.
- **Green Impact Certificates:** Issue dynamic, evolving ERC721 NFT certificates based on total traded volume to quantify renewable energy contributions.
- **Analytics Dashboard:** Monitor real-world environmental impact metrics, including carbon dioxide (CO2) offsets, equivalent trees planted, and homes powered.

## Technology Stack

- **Smart Contracts:** Solidity, OpenZeppelin
- **Blockchain Environment:** Hardhat, Ethers.js
- **Frontend Framework:** React.js
- **Data Visualization:** Recharts
- **Styling:** Custom CSS

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MetaMask browser extension

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/abhassachan/solar-energy-trading.git
   cd solar-energy-trading
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   cd frontend
   npm install
   cd ..
   ```

### Running Locally

To run the application locally, two separate terminal instances are required.

**Terminal 1: Local Blockchain & Deployment**
Start the local Hardhat node:
```bash
npx hardhat node
```
Leave this terminal running. Open a new terminal window in the root directory and deploy the smart contracts:
```bash
npm run deploy
```

**Terminal 2: React Frontend**
Navigate to the frontend directory and start the development server:
```bash
cd frontend
npm start
```

### MetaMask Configuration
1. Open MetaMask and add a custom network with the following details:
   - **Network Name:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
2. Import one of the private keys provided by the Hardhat node terminal to acquire test ETH for transactions.

## Smart Contract Architecture

- `EnergyToken.sol`: Custom ERC20 token contract representing generated solar energy.
- `Marketplace.sol`: Manages the direct peer-to-peer listing and purchasing of energy tokens.
- `EnergyAuction.sol`: Manages timed auctions, bid processing, and finalization protocols.
- `EnergyCertificate.sol`: ERC721 NFT contract responsible for minting evolving impact certificates to active market participants.

## License
This project is licensed under the MIT License.
