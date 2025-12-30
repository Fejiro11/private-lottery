// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title AccessControl
 * @notice Demonstrates FHE access control mechanisms
 * @dev Shows FHE.allow, FHE.allowThis, FHE.allowTransient
 * @chapter access-control
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract AccessControl is ZamaEthereumConfig {
    /// @notice Encrypted balance for each user
    mapping(address => euint32) private _balances;

    /// @notice Emitted when a deposit is made
    event Deposited(address indexed user);
    
    /// @notice Emitted when access is granted
    event AccessGranted(address indexed user, address indexed to);

    /**
     * @notice Deposit an encrypted amount
     * @dev Demonstrates FHE.allowThis - grants contract permission
     * @param encryptedAmount The encrypted deposit amount
     * @param inputProof Zero-knowledge proof
     */
    function deposit(externalEuint32 encryptedAmount, bytes calldata inputProof) external {
        euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Add to existing balance
        _balances[msg.sender] = FHE.add(_balances[msg.sender], amount);
        
        // IMPORTANT: Grant contract permission to use this value
        // Without this, subsequent operations would fail
        FHE.allowThis(_balances[msg.sender]);
        
        // Grant user permission to decrypt their own balance
        FHE.allow(_balances[msg.sender], msg.sender);

        emit Deposited(msg.sender);
    }

    /**
     * @notice Get your encrypted balance
     * @dev Only works if caller has been granted permission
     * @return The encrypted balance (euint32 handle)
     */
    function getBalance() external view returns (euint32) {
        return _balances[msg.sender];
    }

    /**
     * @notice Grant another address permission to view your balance
     * @dev Demonstrates FHE.allow for third-party access
     * @param viewer The address to grant access to
     */
    function grantViewAccess(address viewer) external {
        require(FHE.isInitialized(_balances[msg.sender]), "No balance to share");
        
        // Grant the viewer permission to decrypt sender's balance
        FHE.allow(_balances[msg.sender], viewer);
        
        emit AccessGranted(msg.sender, viewer);
    }

    /**
     * @notice Transfer encrypted amount to another contract
     * @dev Demonstrates FHE.allowTransient for cross-contract calls
     * @param to The target contract address
     * @param encryptedAmount The encrypted transfer amount
     * @param inputProof Zero-knowledge proof
     */
    function transferTo(
        address to,
        externalEuint32 encryptedAmount,
        bytes calldata inputProof
    ) external {
        euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Grant temporary permission for the target contract
        // This permission only lasts for the current transaction
        FHE.allowTransient(amount, to);
        
        // The target contract can now use 'amount' in this transaction
        // Note: Actual transfer logic would go here
    }

    /**
     * @notice Check if a balance is initialized
     * @dev Uses FHE.isInitialized helper
     */
    function hasBalance(address user) external view returns (bool) {
        return FHE.isInitialized(_balances[user]);
    }
}
