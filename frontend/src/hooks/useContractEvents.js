import { useEffect } from 'react';
import { ethers } from 'ethers';
import MarketplaceABI from '../contracts/Marketplace.json';
import EnergyAuctionABI from '../contracts/EnergyAuction.json';
import addresses from '../contracts/addresses';

export function useContractEvents(provider, callbacks) {
  const {
    onEnergyListed,
    onEnergyPurchased,
    onListingCancelled,
    onAuctionCreated,
    onBidPlaced,
    onAuctionEnded
  } = callbacks;

  useEffect(() => {
    if (!provider) return;

    const marketplace = new ethers.Contract(addresses.Marketplace, MarketplaceABI.abi, provider);

    const handleEnergyListed = (listingId, seller, amount, pricePerUnit) => {
      if (onEnergyListed) {
        onEnergyListed({
          id: listingId.toString(),
          seller,
          amount: amount.toString(),
          pricePerUnit: ethers.formatEther(pricePerUnit)
        });
      }
    };

    const handleEnergyPurchased = (listingId, buyer, seller, amount, totalPrice) => {
      if (onEnergyPurchased) {
        onEnergyPurchased({
          id: listingId.toString(),
          buyer,
          seller,
          amount: amount.toString(),
          totalPrice: ethers.formatEther(totalPrice)
        });
      }
    };

    const handleListingCancelled = (listingId, seller) => {
      if (onListingCancelled) {
        onListingCancelled({
          id: listingId.toString(),
          seller
        });
      }
    };

    marketplace.on('EnergyListed', handleEnergyListed);
    marketplace.on('EnergyPurchased', handleEnergyPurchased);
    marketplace.on('ListingCancelled', handleListingCancelled);

    // Auction events
    let auction = null;
    if (addresses.EnergyAuction) {
      auction = new ethers.Contract(addresses.EnergyAuction, EnergyAuctionABI.abi, provider);

      const handleAuctionCreated = (auctionId, seller, amount, startingPrice, endTime) => {
        if (onAuctionCreated) {
          onAuctionCreated({
            id: auctionId.toString(),
            seller,
            amount: amount.toString(),
            startingPrice: ethers.formatEther(startingPrice),
            endTime: Number(endTime)
          });
        }
      };

      const handleBidPlaced = (auctionId, bidder, amount) => {
        if (onBidPlaced) {
          onBidPlaced({
            id: auctionId.toString(),
            bidder,
            bid: ethers.formatEther(amount)
          });
        }
      };

      const handleAuctionEnded = (auctionId, winner, tokenAmount, finalPrice) => {
        if (onAuctionEnded) {
          onAuctionEnded({
            id: auctionId.toString(),
            winner,
            amount: tokenAmount.toString(),
            finalPrice: ethers.formatEther(finalPrice)
          });
        }
      };

      auction.on('AuctionCreated', handleAuctionCreated);
      auction.on('BidPlaced', handleBidPlaced);
      auction.on('AuctionEnded', handleAuctionEnded);
    }

    return () => {
      marketplace.off('EnergyListed', handleEnergyListed);
      marketplace.off('EnergyPurchased', handleEnergyPurchased);
      marketplace.off('ListingCancelled', handleListingCancelled);
      if (auction) {
        auction.removeAllListeners();
      }
    };
  }, [provider, onEnergyListed, onEnergyPurchased, onListingCancelled, onAuctionCreated, onBidPlaced, onAuctionEnded]);
}
