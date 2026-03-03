// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EnergyToken
 * @dev Each token = 1 kWh of solar energy
 * Prosumers can mint tokens representing their surplus energy
 */
contract EnergyToken is ERC20, Ownable {

    // Track each user's total energy generated (in kWh)
    mapping(address => uint256) public energyGenerated;

    // Emit this event every time someone generates energy
    event EnergyGenerated(address indexed producer, uint256 amount);

    constructor() ERC20("EnergyToken", "ENRG") Ownable(msg.sender) {}

    /**
     * @dev Prosumer calls this to mint tokens for their surplus solar energy
     * @param amount Number of kWh tokens to mint
     */
    function generateEnergy(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        // Mint tokens to the caller's wallet
        _mint(msg.sender, amount * 10 ** decimals());

        // Track how much this producer has generated
        energyGenerated[msg.sender] += amount;

        emit EnergyGenerated(msg.sender, amount);
    }

    /**
     * @dev Returns token balance in readable kWh (without decimals)
     */
    function getEnergyBalance(address account) external view returns (uint256) {
        return balanceOf(account) / 10 ** decimals();
    }
}