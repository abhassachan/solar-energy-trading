import { useEffect } from 'react';
import { ethers } from 'ethers';
import MarketplaceABI from '../contracts/Marketplace.json';
import addresses from '../contracts/addresses';

export function useContractEvents(provider, callbacks) {
  const { onEnergyListed, onEnergyPurchased, onListingCancelled } = callbacks;

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

    return () => {
      marketplace.off('EnergyListed', handleEnergyListed);
      marketplace.off('EnergyPurchased', handleEnergyPurchased);
      marketplace.off('ListingCancelled', handleListingCancelled);
    };
  }, [provider, onEnergyListed, onEnergyPurchased, onListingCancelled]);
}
