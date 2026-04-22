// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EnergyToken.sol";

/**
 * @title Marketplace
 * @dev Handles peer-to-peer energy trading
 * Producers list tokens, consumers buy them with ETH
 */
contract Marketplace {

    EnergyToken public energyToken;
    address public owner;

    // Counter to give each listing a unique ID
    uint256 public listingCount;

    // Structure of a single energy listing
    struct Listing {
        uint256 id;
        address seller;
        uint256 amount;       // in kWh tokens
        uint256 pricePerUnit; // price in wei per kWh
        bool isActive;        // false once sold or cancelled
    }

    // Store all listings: listingId => Listing
    mapping(uint256 => Listing) public listings;

    // Events — frontend listens to these
    event EnergyListed(uint256 indexed listingId, address indexed seller, uint256 amount, uint256 pricePerUnit);
    event EnergyPurchased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 amount, uint256 totalPrice);
    event ListingCancelled(uint256 indexed listingId, address indexed seller);

    constructor(address _energyTokenAddress) {
        energyToken = EnergyToken(_energyTokenAddress);
        owner = msg.sender;
    }

    /**
     * @dev Producer lists their energy tokens for sale
     * @param amount Number of kWh tokens to sell
     * @param pricePerUnit Price in wei per kWh token
     */
    function listEnergy(uint256 amount, uint256 pricePerUnit) external {
        require(amount > 0, "Amount must be greater than 0");
        require(pricePerUnit > 0, "Price must be greater than 0");

        uint256 tokenAmount = amount * 10 ** energyToken.decimals();

        // Check seller actually has enough tokens
        require(energyToken.balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");

        // Transfer tokens from seller to this contract (locked until sold)
        energyToken.transferFrom(msg.sender, address(this), tokenAmount);

        // Create the listing
        listingCount++;
        listings[listingCount] = Listing({
            id: listingCount,
            seller: msg.sender,
            amount: amount,
            pricePerUnit: pricePerUnit,
            isActive: true
        });

        emit EnergyListed(listingCount, msg.sender, amount, pricePerUnit);
    }

    /**
     * @dev Consumer buys energy from a listing (supports partial purchases)
     * @param listingId ID of the listing to purchase
     * @param amountToBuy Number of kWh tokens to buy (can be less than listing amount)
     */
    function buyEnergy(uint256 listingId, uint256 amountToBuy) external payable {
        Listing storage listing = listings[listingId];

        require(listing.isActive, "Listing is not active");
        require(listing.seller != msg.sender, "Cannot buy your own listing");
        require(amountToBuy > 0, "Amount must be greater than 0");
        require(amountToBuy <= listing.amount, "Amount exceeds listing");

        uint256 totalPrice = amountToBuy * listing.pricePerUnit;
        require(msg.value >= totalPrice, "Insufficient ETH sent");

        // Update listing amount BEFORE transfers (security best practice)
        listing.amount -= amountToBuy;
        if (listing.amount == 0) {
            listing.isActive = false;
        }

        // Transfer tokens from contract to buyer
        uint256 tokenAmount = amountToBuy * 10 ** energyToken.decimals();
        energyToken.transfer(msg.sender, tokenAmount);

        // Transfer ETH payment to seller
        payable(listing.seller).transfer(totalPrice);

        // Refund any excess ETH sent
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        emit EnergyPurchased(listingId, msg.sender, listing.seller, amountToBuy, totalPrice);
    }

    /**
     * @dev Seller can cancel their listing and get tokens back
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];

        require(listing.isActive, "Listing is not active");
        require(listing.seller == msg.sender, "Only seller can cancel");

        listing.isActive = false;

        // Return tokens back to seller
        uint256 tokenAmount = listing.amount * 10 ** energyToken.decimals();
        energyToken.transfer(msg.sender, tokenAmount);

        emit ListingCancelled(listingId, msg.sender);
    }

    /**
     * @dev Get all active listings
     */
    function getActiveListings() external view returns (Listing[] memory) {
        uint256 activeCount = 0;

        // Count active listings first
        for (uint256 i = 1; i <= listingCount; i++) {
            if (listings[i].isActive) activeCount++;
        }

        // Build array of active listings
        Listing[] memory active = new Listing[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= listingCount; i++) {
            if (listings[i].isActive) {
                active[index] = listings[i];
                index++;
            }
        }
        return active;
    }
}