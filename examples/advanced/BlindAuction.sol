// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title BlindAuction
 * @notice Confidential blind auction with encrypted bids
 * @dev Shows complex FHE state management with encrypted comparisons
 * @chapter advanced
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract BlindAuction is ZamaEthereumConfig {
    /// @notice Auction states
    enum AuctionState { Active, Ended, Revealed }

    /// @notice The auction owner
    address public owner;
    
    /// @notice Auction end time
    uint256 public endTime;
    
    /// @notice Current auction state
    AuctionState public state;
    
    /// @notice Encrypted highest bid
    euint64 private _highestBid;
    
    /// @notice Encrypted address of highest bidder (as euint160)
    eaddress private _highestBidder;
    
    /// @notice Revealed winner address
    address public revealedWinner;
    
    /// @notice Revealed winning bid
    uint64 public revealedBid;

    /// @notice Track if user has bid
    mapping(address => bool) public hasBid;

    event BidPlaced(address indexed bidder);
    event AuctionEnded();
    event WinnerRevealed(address winner, uint64 bid);

    error AuctionNotActive();
    error AuctionNotEnded();
    error AlreadyBid();
    error OnlyOwner();

    constructor(uint256 duration) {
        owner = msg.sender;
        endTime = block.timestamp + duration;
        state = AuctionState.Active;
        
        // Initialize highest bid to 0
        _highestBid = FHE.asEuint64(0);
        FHE.allowThis(_highestBid);
    }

    /**
     * @notice Place an encrypted bid
     * @dev Uses FHE.select for confidential max comparison
     * @param encryptedBid The encrypted bid amount
     * @param inputProof Zero-knowledge proof
     */
    function bid(externalEuint64 encryptedBid, bytes calldata inputProof) external {
        if (state != AuctionState.Active) revert AuctionNotActive();
        if (block.timestamp >= endTime) revert AuctionNotActive();
        if (hasBid[msg.sender]) revert AlreadyBid();

        euint64 bidAmount = FHE.fromExternal(encryptedBid, inputProof);
        
        // Compare new bid with current highest (encrypted comparison)
        ebool isHigher = FHE.gt(bidAmount, _highestBid);
        
        // Conditionally update highest bid using FHE.select
        _highestBid = FHE.select(isHigher, bidAmount, _highestBid);
        
        // Update highest bidder (encrypted address comparison)
        eaddress newBidder = FHE.asEaddress(msg.sender);
        _highestBidder = FHE.select(isHigher, newBidder, _highestBidder);
        
        // Grant permissions
        FHE.allowThis(_highestBid);
        FHE.allowThis(_highestBidder);
        
        hasBid[msg.sender] = true;
        
        emit BidPlaced(msg.sender);
    }

    /**
     * @notice End the auction and request decryption
     */
    function endAuction() external {
        if (block.timestamp < endTime) revert AuctionNotEnded();
        if (state != AuctionState.Active) revert AuctionNotActive();
        
        state = AuctionState.Ended;
        
        // Make winner and bid publicly decryptable
        FHE.makePubliclyDecryptable(_highestBid);
        FHE.makePubliclyDecryptable(_highestBidder);
        
        emit AuctionEnded();
    }

    /**
     * @notice Reveal the winner with decryption proof
     * @param winner The decrypted winner address
     * @param winningBid The decrypted winning bid
     * @param decryptionProof Proof from Zama KMS
     */
    function revealWinner(
        address winner,
        uint64 winningBid,
        bytes calldata decryptionProof
    ) external {
        if (state != AuctionState.Ended) revert AuctionNotEnded();
        
        // Verify decryption proofs
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(_highestBidder);
        handles[1] = FHE.toBytes32(_highestBid);
        
        bytes memory abiEncoded = abi.encode(winner, winningBid);
        FHE.checkSignatures(handles, abiEncoded, decryptionProof);
        
        revealedWinner = winner;
        revealedBid = winningBid;
        state = AuctionState.Revealed;
        
        emit WinnerRevealed(winner, winningBid);
    }

    /**
     * @notice Get the encrypted highest bid (for authorized parties)
     */
    function getHighestBid() external view returns (euint64) {
        return _highestBid;
    }
}
