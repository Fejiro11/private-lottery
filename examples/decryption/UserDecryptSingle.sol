// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title UserDecryptSingle
 * @notice Demonstrates user-specific decryption of encrypted values
 * @dev Shows FHE.allow for granting user decryption permissions
 * @chapter decryption
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract UserDecryptSingle is ZamaEthereumConfig {
    /// @notice Mapping of user addresses to their encrypted balances
    mapping(address => euint32) private _balances;

    /// @notice Emitted when a balance is set
    event BalanceSet(address indexed user);

    /**
     * @notice Set an encrypted balance for the caller
     * @dev Grants both contract and user decryption permissions
     * @param encryptedBalance The encrypted balance value
     * @param inputProof Zero-knowledge proof for the input
     */
    function setBalance(
        externalEuint32 encryptedBalance,
        bytes calldata inputProof
    ) external {
        euint32 balance = FHE.fromExternal(encryptedBalance, inputProof);
        
        _balances[msg.sender] = balance;
        
        // Grant contract permission to use this value
        FHE.allowThis(balance);
        
        // Grant the user permission to decrypt their own balance
        // This is essential for user decryption to work
        FHE.allow(balance, msg.sender);

        emit BalanceSet(msg.sender);
    }

    /**
     * @notice Get the caller's encrypted balance
     * @dev Only the owner can decrypt this value off-chain
     * @return The encrypted balance (euint32 handle)
     */
    function getMyBalance() external view returns (euint32) {
        return _balances[msg.sender];
    }

    /**
     * @notice Get any user's encrypted balance handle
     * @dev Returns the handle, but only the owner can decrypt it
     * @param user The address to query
     * @return The encrypted balance handle
     */
    function getBalanceOf(address user) external view returns (euint32) {
        return _balances[user];
    }

    /**
     * @notice Grant another address permission to decrypt your balance
     * @dev Useful for authorized third parties (e.g., auditors)
     * @param delegate The address to grant permission to
     */
    function grantDecryptPermission(address delegate) external {
        euint32 balance = _balances[msg.sender];
        require(FHE.isInitialized(balance), "No balance set");
        
        // Grant the delegate permission to decrypt
        FHE.allow(balance, delegate);
    }

    /**
     * @notice Check if a balance is initialized
     * @param user The address to check
     * @return True if balance exists
     */
    function hasBalance(address user) external view returns (bool) {
        return FHE.isInitialized(_balances[user]);
    }
}
