// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EnergyToken.sol";

interface IEnergyCertificate {
    function mintCertificate(address consumer, address producer, uint256 amount) external returns (uint256);
}

/**
 * @title EnergyAuction
 * @dev English auction system for energy tokens
 * Sellers create timed auctions, buyers place bids
 * Highest bidder wins when timer expires
 */
contract EnergyAuction {

    IEnergyCertificate public energyCertificate;

    function setCertificateContract(address _cert) external {
        require(msg.sender == owner, "Only owner");
        energyCertificate = IEnergyCertificate(_cert);
    }

    EnergyToken public energyToken;
    address public owner;

    uint256 public auctionCount;

    struct Auction {
        uint256 id;
        address seller;
        uint256 tokenAmount;      // kWh being auctioned
        uint256 startingPrice;    // minimum bid in wei
        uint256 endTime;          // timestamp when auction ends
        address highestBidder;
        uint256 highestBid;
        bool ended;               // true after finalization
        bool cancelled;           // true if cancelled
    }

    // Store all auctions: auctionId => Auction
    mapping(uint256 => Auction) public auctions;

    // Events
    event AuctionCreated(uint256 indexed auctionId, address indexed seller, uint256 amount, uint256 startingPrice, uint256 endTime);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 tokenAmount, uint256 finalPrice);
    event AuctionCancelled(uint256 indexed auctionId, address indexed seller);

    constructor(address _energyTokenAddress) {
        energyToken = EnergyToken(_energyTokenAddress);
        owner = msg.sender;
    }

    /**
     * @dev Seller creates a timed auction for their energy tokens
     * @param amount Number of kWh tokens to auction
     * @param startingPrice Minimum bid in wei
     * @param durationMinutes Auction duration in minutes
     */
    function createAuction(uint256 amount, uint256 startingPrice, uint256 durationMinutes) external {
        require(amount > 0, "Amount must be greater than 0");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(durationMinutes > 0, "Duration must be greater than 0");
        require(durationMinutes <= 1440, "Duration cannot exceed 24 hours");

        uint256 tokenAmount = amount * 10 ** energyToken.decimals();

        // Check seller has enough tokens
        require(energyToken.balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");

        // Transfer tokens from seller to this contract (locked for auction)
        energyToken.transferFrom(msg.sender, address(this), tokenAmount);

        // Create the auction
        auctionCount++;
        uint256 endTime = block.timestamp + (durationMinutes * 1 minutes);

        auctions[auctionCount] = Auction({
            id: auctionCount,
            seller: msg.sender,
            tokenAmount: amount,
            startingPrice: startingPrice,
            endTime: endTime,
            highestBidder: address(0),
            highestBid: 0,
            ended: false,
            cancelled: false
        });

        emit AuctionCreated(auctionCount, msg.sender, amount, startingPrice, endTime);
    }

    /**
     * @dev Place a bid on an active auction
     * @param auctionId ID of the auction to bid on
     */
    function placeBid(uint256 auctionId) external payable {
        Auction storage auction = auctions[auctionId];

        require(!auction.ended, "Auction has ended");
        require(!auction.cancelled, "Auction was cancelled");
        require(block.timestamp < auction.endTime, "Auction time expired");
        require(msg.sender != auction.seller, "Seller cannot bid");
        require(msg.value >= auction.startingPrice, "Bid below starting price");
        require(msg.value > auction.highestBid, "Bid must be higher than current highest");

        // Refund the previous highest bidder
        address previousBidder = auction.highestBidder;
        uint256 previousBid = auction.highestBid;

        // Update state BEFORE transferring ETH (checks-effects-interactions)
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;

        // Refund previous bidder (if there was one)
        if (previousBidder != address(0)) {
            payable(previousBidder).transfer(previousBid);
        }

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @dev End an auction after time has expired
     * Anyone can call this to finalize the auction
     * @param auctionId ID of the auction to end
     */
    function endAuction(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];

        require(!auction.ended, "Auction already ended");
        require(!auction.cancelled, "Auction was cancelled");
        require(block.timestamp >= auction.endTime, "Auction not yet expired");

        // Mark as ended BEFORE transfers
        auction.ended = true;

        uint256 tokenAmount = auction.tokenAmount * 10 ** energyToken.decimals();

        if (auction.highestBidder != address(0)) {
            // There was a winner — transfer tokens to winner, ETH to seller
            energyToken.transfer(auction.highestBidder, tokenAmount);
            payable(auction.seller).transfer(auction.highestBid);

            // Mint NFT Certificate
            if (address(energyCertificate) != address(0)) {
                energyCertificate.mintCertificate(auction.highestBidder, auction.seller, auction.tokenAmount);
            }

            emit AuctionEnded(auctionId, auction.highestBidder, auction.tokenAmount, auction.highestBid);
        } else {
            // No bids — return tokens to seller
            energyToken.transfer(auction.seller, tokenAmount);

            emit AuctionEnded(auctionId, address(0), auction.tokenAmount, 0);
        }
    }

    /**
     * @dev Seller cancels auction (only if no bids have been placed)
     * @param auctionId ID of the auction to cancel
     */
    function cancelAuction(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];

        require(auction.seller == msg.sender, "Only seller can cancel");
        require(!auction.ended, "Auction already ended");
        require(!auction.cancelled, "Auction already cancelled");
        require(auction.highestBidder == address(0), "Cannot cancel with active bids");

        // Mark as cancelled BEFORE transfer
        auction.cancelled = true;

        // Return tokens to seller
        uint256 tokenAmount = auction.tokenAmount * 10 ** energyToken.decimals();
        energyToken.transfer(msg.sender, tokenAmount);

        emit AuctionCancelled(auctionId, msg.sender);
    }

    /**
     * @dev Get all active auctions (not ended and not cancelled)
     */
    function getActiveAuctions() external view returns (Auction[] memory) {
        uint256 activeCount = 0;

        // Count active auctions first
        for (uint256 i = 1; i <= auctionCount; i++) {
            if (!auctions[i].ended && !auctions[i].cancelled) activeCount++;
        }

        // Build array of active auctions
        Auction[] memory active = new Auction[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= auctionCount; i++) {
            if (!auctions[i].ended && !auctions[i].cancelled) {
                active[index] = auctions[i];
                index++;
            }
        }
        return active;
    }

    /**
     * @dev Get details of a single auction
     */
    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }
}
