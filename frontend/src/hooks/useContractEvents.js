import { useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import MarketplaceABI from '../contracts/Marketplace.json';
import addresses from '../contracts/addresses';

/**
 * Hook that listens to Marketplace contract events in real-time
 * Calls provided callbacks when events occur
 */
export function useContractEvents(provider, {
  onEnergyListed,
  onEnergyPurchased,
  onListingCancelled
}) {
  const setupListeners = useCallback(async () => {
    if (!provider) return;

    const marketplace = new ethers.Contract(
      addresses.Marketplace,
      MarketplaceABI.abi,
      provider
    );

    // Listen for new listings
    marketplace.on('EnergyListed', (listingId, seller, amount, pricePerUnit) => {
      console.log('🆕 New listing:', listingId.toString());
      if (onEnergyListed) onEnergyListed({
        id: listingId.toString(),
        seller,
        amount: amount.toString(),
        pricePerUnit: ethers.formatEther(pricePerUnit)
      });
    });

    // Listen for purchases
    marketplace.on('EnergyPurchased', (listingId, buyer, seller, amount, totalPrice) => {
      console.log('💰 Energy purchased:', listingId.toString());
      if (onEnergyPurchased) onEnergyPurchased({
        id: listingId.toString(),
        buyer,
        seller,
        amount: amount.toString(),
        totalPrice: ethers.formatEther(totalPrice)
      });
    });

    // Listen for cancellations
    marketplace.on('ListingCancelled', (listingId, seller) => {
      console.log('❌ Listing cancelled:', listingId.toString());
      if (onListingCancelled) onListingCancelled({
        id: listingId.toString(),
        seller
      });
    });

    // Cleanup function — remove listeners when component unmounts
    return () => {
      marketplace.removeAllListeners();
    };

  }, [provider, onEnergyListed, onEnergyPurchased, onListingCancelled]);

  useEffect(() => {
    let cleanup;
    setupListeners().then(fn => { cleanup = fn; });
    return () => { if (cleanup) cleanup(); };
  }, [setupListeners]);
}