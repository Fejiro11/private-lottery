// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PrivLottery
 * @notice A privacy-first lottery using Fully Homomorphic Encryption
 * @dev All guesses and confidence values remain encrypted until settlement
 * 
 * Winner Categories:
 * 1. Conviction Weighted - Best combination of accuracy and confidence (50%)
 * 2. Raw Accuracy - Closest guess regardless of confidence (30%)
 * 3. Best Calibrated - Confidence most closely matched actual error (20%)
 */
contract PrivLottery is ZamaEthereumConfig {
    // ============ Constants ============
    uint256 public constant ROUND_DURATION = 1 hours;
    uint256 public constant ENTRY_PRICE = 0.001 ether;
    uint256 public constant MAX_PARTICIPANTS = 100;
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint32 public constant MIN_GUESS = 1;
    uint32 public constant MAX_GUESS = 1000;
    uint32 public constant MAX_CONFIDENCE = 100;
    
    // Prize distribution in basis points
    uint256 public constant CONVICTION_SHARE_BPS = 5000; // 50%
    uint256 public constant ACCURACY_SHARE_BPS = 3000;   // 30%
    uint256 public constant CALIBRATION_SHARE_BPS = 2000; // 20%

    // ============ Enums ============
    enum RoundStatus { Active, Settling, Revealing, Completed, Cancelled }
    enum WinnerCategory { Conviction, Accuracy, Calibration }

    // ============ Structs ============
    struct Participant {
        address addr;
        euint32 encryptedGuess;
        euint32 encryptedConfidence;
        uint256 submittedAt;
        uint32 revealedGuess;
        uint32 revealedConfidence;
        bool isRevealed;
    }

    struct Winner {
        address addr;
        WinnerCategory category;
        uint256 prize;
        uint32 guess;
        uint32 confidence;
        uint256 score;
    }

    struct Round {
        uint256 roundId;
        uint256 startTime;
        uint256 endTime;
        RoundStatus status;
        euint32 encryptedWinningNumber;
        uint32 revealedWinningNumber;
        uint256 prizePool;
        uint256 participantCount;
        Winner[3] winners;
        bool isSettled;
    }

    // ============ State Variables ============
    uint256 public currentRoundId;
    address public treasury;
    
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(uint256 => Participant)) public participants;
    mapping(uint256 => mapping(address => bool)) public hasParticipated;
    
    uint256 public totalFeesCollected;

    // ============ Events ============
    event RoundStarted(uint256 indexed roundId, uint256 startTime, uint256 endTime);
    event ParticipantJoined(uint256 indexed roundId, address indexed participant, uint256 participantIndex);
    event RoundSettling(uint256 indexed roundId);
    event RoundRevealed(uint256 indexed roundId, uint32 winningNumber);
    event WinnerDeclared(uint256 indexed roundId, WinnerCategory category, address winner, uint256 prize);
    event RoundCompleted(uint256 indexed roundId);
    event RoundCancelled(uint256 indexed roundId, uint256 participantCount);

    // ============ Errors ============
    error RoundNotActive();
    error RoundEnded();
    error AlreadyParticipated();
    error RoundFull();
    error IncorrectEntryFee();
    error NotEnoughParticipants();
    error RoundNotEnded();
    error RoundNotSettling();
    error RoundNotRevealing();
    error InvalidRevealCount();
    error TransferFailed();

    // ============ Constructor ============
    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        _startNewRound();
    }

    // ============ External Functions ============

    /**
     * @notice Submit an encrypted guess and confidence level
     * @param encryptedGuess The encrypted guess (1-1000)
     * @param encryptedConfidence The encrypted confidence level (1-100)
     * @param inputProof Zero-knowledge proof for the encrypted inputs
     */
    function submitPrediction(
        externalEuint32 encryptedGuess,
        externalEuint32 encryptedConfidence,
        bytes calldata inputProof
    ) external payable {
        Round storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Active) revert RoundNotActive();
        if (block.timestamp >= round.endTime) revert RoundEnded();
        if (hasParticipated[currentRoundId][msg.sender]) revert AlreadyParticipated();
        if (round.participantCount >= MAX_PARTICIPANTS) revert RoundFull();
        if (msg.value != ENTRY_PRICE) revert IncorrectEntryFee();

        // Convert external encrypted inputs to internal encrypted types
        euint32 guess = FHE.fromExternal(encryptedGuess, inputProof);
        euint32 confidence = FHE.fromExternal(encryptedConfidence, inputProof);

        // Store participant data
        uint256 participantIndex = round.participantCount;
        participants[currentRoundId][participantIndex] = Participant({
            addr: msg.sender,
            encryptedGuess: guess,
            encryptedConfidence: confidence,
            submittedAt: block.timestamp,
            revealedGuess: 0,
            revealedConfidence: 0,
            isRevealed: false
        });

        // Update round state
        round.participantCount++;
        round.prizePool += msg.value;
        hasParticipated[currentRoundId][msg.sender] = true;

        // Grant ACL permissions for later decryption
        FHE.allowThis(guess);
        FHE.allowThis(confidence);

        emit ParticipantJoined(currentRoundId, msg.sender, participantIndex);
    }

    /**
     * @notice Cancel a round that ended with insufficient participants
     * @dev Refunds all participants and starts a new round
     */
    function cancelRound() external {
        Round storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Active) revert RoundNotActive();
        if (block.timestamp < round.endTime) revert RoundNotEnded();
        if (round.participantCount >= 3) revert("Use settleRound instead");

        // Refund all participants
        for (uint256 i = 0; i < round.participantCount; i++) {
            address participant = participants[currentRoundId][i].addr;
            (bool sent, ) = participant.call{value: ENTRY_PRICE}("");
            require(sent, "Refund failed");
        }

        round.status = RoundStatus.Cancelled;
        emit RoundCancelled(currentRoundId, round.participantCount);

        // Start new round
        _startNewRound();
    }

    /**
     * @notice Trigger settlement when round timer expires
     */
    function settleRound() external {
        Round storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Active) revert RoundNotActive();
        if (block.timestamp < round.endTime) revert RoundNotEnded();
        if (round.participantCount < 3) revert NotEnoughParticipants();

        round.status = RoundStatus.Settling;
        
        // Make the winning number publicly decryptable
        FHE.makePubliclyDecryptable(round.encryptedWinningNumber);

        emit RoundSettling(currentRoundId);
    }

    /**
     * @notice Finalize the round with revealed winning number
     * @param winningNumber The revealed winning number
     * @param decryptionProof Proof from Zama KMS
     */
    function finalizeRound(
        uint32 winningNumber,
        bytes calldata decryptionProof
    ) external {
        Round storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Settling) revert RoundNotSettling();

        // Verify the decryption proof
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(round.encryptedWinningNumber);
        bytes memory abiEncoded = abi.encode(winningNumber);
        FHE.checkSignatures(handles, abiEncoded, decryptionProof);

        round.revealedWinningNumber = winningNumber;
        round.status = RoundStatus.Revealing;

        emit RoundRevealed(currentRoundId, winningNumber);
    }

    /**
     * @notice Process all participants and determine winners
     * @param participantReveals Array of (guess, confidence) pairs
     * @param batchProof Combined decryption proof
     */
    function processWinners(
        uint32[] calldata participantReveals,
        bytes calldata batchProof
    ) external {
        Round storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Revealing) revert RoundNotRevealing();
        if (participantReveals.length != round.participantCount * 2) revert InvalidRevealCount();

        // Verify all decryption proofs
        bytes32[] memory handles = new bytes32[](round.participantCount * 2);
        for (uint256 i = 0; i < round.participantCount; i++) {
            Participant storage p = participants[currentRoundId][i];
            handles[i * 2] = FHE.toBytes32(p.encryptedGuess);
            handles[i * 2 + 1] = FHE.toBytes32(p.encryptedConfidence);
        }
        
        bytes memory abiEncoded = abi.encode(participantReveals);
        FHE.checkSignatures(handles, abiEncoded, batchProof);

        // Store revealed values
        for (uint256 i = 0; i < round.participantCount; i++) {
            Participant storage p = participants[currentRoundId][i];
            p.revealedGuess = participantReveals[i * 2];
            p.revealedConfidence = participantReveals[i * 2 + 1];
            p.isRevealed = true;
        }

        // Calculate winners and distribute prizes
        _calculateWinners(currentRoundId);
        _distributePrizes(currentRoundId);

        round.status = RoundStatus.Completed;
        round.isSettled = true;

        emit RoundCompleted(currentRoundId);

        // Start next round
        _startNewRound();
    }

    // ============ View Functions ============

    function getCurrentRound() external view returns (
        uint256 roundId,
        uint256 startTime,
        uint256 endTime,
        RoundStatus status,
        uint256 prizePool,
        uint256 participantCount
    ) {
        Round storage round = rounds[currentRoundId];
        return (
            round.roundId,
            round.startTime,
            round.endTime,
            round.status,
            round.prizePool,
            round.participantCount
        );
    }

    function getRoundWinners(uint256 roundId) external view returns (Winner[3] memory) {
        return rounds[roundId].winners;
    }

    function getParticipant(uint256 roundId, uint256 index) external view returns (
        address addr,
        uint256 submittedAt,
        uint32 revealedGuess,
        uint32 revealedConfidence,
        bool isRevealed
    ) {
        Participant storage p = participants[roundId][index];
        return (p.addr, p.submittedAt, p.revealedGuess, p.revealedConfidence, p.isRevealed);
    }

    // ============ Internal Functions ============

    function _startNewRound() internal {
        currentRoundId++;
        
        // Generate random winning number
        // Note: Uses euint16 (0-65535) masked to approximate 0-1023 range
        // The scoring logic handles any value gracefully
        euint16 rawRandom = FHE.randEuint16();
        // Mask to 10 bits (0-1023) which closely matches our 0-1000 range
        euint16 masked = FHE.and(rawRandom, FHE.asEuint16(1023));
        euint32 encryptedWinning = FHE.asEuint32(masked);
        FHE.allowThis(encryptedWinning);

        rounds[currentRoundId] = Round({
            roundId: currentRoundId,
            startTime: block.timestamp,
            endTime: block.timestamp + ROUND_DURATION,
            status: RoundStatus.Active,
            encryptedWinningNumber: encryptedWinning,
            revealedWinningNumber: 0,
            prizePool: 0,
            participantCount: 0,
            winners: [
                Winner(address(0), WinnerCategory.Conviction, 0, 0, 0, 0),
                Winner(address(0), WinnerCategory.Accuracy, 0, 0, 0, 0),
                Winner(address(0), WinnerCategory.Calibration, 0, 0, 0, 0)
            ],
            isSettled: false
        });

        emit RoundStarted(currentRoundId, block.timestamp, block.timestamp + ROUND_DURATION);
    }

    function _calculateWinners(uint256 roundId) internal {
        Round storage round = rounds[roundId];
        uint32 winningNum = round.revealedWinningNumber;
        
        uint256 bestConvictionScore = 0;
        uint256 bestAccuracyScore = type(uint256).max;
        uint256 bestCalibrationScore = type(uint256).max;
        
        uint256 convictionWinner;
        uint256 accuracyWinner;
        uint256 calibrationWinner;

        for (uint256 i = 0; i < round.participantCount; i++) {
            Participant storage p = participants[roundId][i];
            
            uint256 distance = _absDiff(p.revealedGuess, winningNum);
            uint256 confidence = p.revealedConfidence;
            
            // Raw score: higher is better (MAX_GUESS - distance)
            uint256 rawScore = distance >= MAX_GUESS ? 0 : uint256(MAX_GUESS) - distance;
            
            // Accuracy percentage: rawScore scaled to 0-100
            uint256 accuracyPct = (rawScore * 100) / MAX_GUESS;
            
            // Conviction score: accuracy weighted by confidence
            uint256 convictionScore = accuracyPct * confidence;
            
            if (convictionScore > bestConvictionScore) {
                bestConvictionScore = convictionScore;
                convictionWinner = i;
            }
            
            if (distance < bestAccuracyScore) {
                bestAccuracyScore = distance;
                accuracyWinner = i;
            }
            
            // Calibration error: |confidence - accuracyPct|
            // Rewards players whose confidence matches their actual accuracy
            uint256 calibrationError = _absDiff256(confidence, accuracyPct);
            if (calibrationError < bestCalibrationScore) {
                bestCalibrationScore = calibrationError;
                calibrationWinner = i;
            }
        }

        // Handle duplicate winners
        if (accuracyWinner == convictionWinner) {
            accuracyWinner = _findSecondBest(roundId, winningNum, convictionWinner, 0);
        }
        if (calibrationWinner == convictionWinner || calibrationWinner == accuracyWinner) {
            calibrationWinner = _findSecondBest(roundId, winningNum, convictionWinner, accuracyWinner);
        }

        // Store winners
        Participant storage pConviction = participants[roundId][convictionWinner];
        Participant storage pAccuracy = participants[roundId][accuracyWinner];
        Participant storage pCalibration = participants[roundId][calibrationWinner];

        round.winners[0] = Winner({
            addr: pConviction.addr,
            category: WinnerCategory.Conviction,
            prize: 0,
            guess: pConviction.revealedGuess,
            confidence: pConviction.revealedConfidence,
            score: bestConvictionScore * 1e16
        });

        round.winners[1] = Winner({
            addr: pAccuracy.addr,
            category: WinnerCategory.Accuracy,
            prize: 0,
            guess: pAccuracy.revealedGuess,
            confidence: pAccuracy.revealedConfidence,
            score: bestAccuracyScore * 1e18
        });

        round.winners[2] = Winner({
            addr: pCalibration.addr,
            category: WinnerCategory.Calibration,
            prize: 0,
            guess: pCalibration.revealedGuess,
            confidence: pCalibration.revealedConfidence,
            score: bestCalibrationScore * 1e18
        });
    }

    function _findSecondBest(
        uint256 roundId,
        uint32 winningNum,
        uint256 exclude1,
        uint256 exclude2
    ) internal view returns (uint256) {
        Round storage round = rounds[roundId];
        uint256 bestScore = type(uint256).max;
        uint256 bestIndex = 0;
        
        for (uint256 i = 0; i < round.participantCount; i++) {
            if (i == exclude1 || i == exclude2) continue;
            Participant storage p = participants[roundId][i];
            uint256 distance = _absDiff(p.revealedGuess, winningNum);
            if (distance < bestScore) {
                bestScore = distance;
                bestIndex = i;
            }
        }
        return bestIndex;
    }

    function _distributePrizes(uint256 roundId) internal {
        Round storage round = rounds[roundId];
        
        uint256 platformFee = (round.prizePool * PLATFORM_FEE_BPS) / 10000;
        uint256 distributablePool = round.prizePool - platformFee;
        
        uint256 convictionPrize = (distributablePool * CONVICTION_SHARE_BPS) / 10000;
        uint256 accuracyPrize = (distributablePool * ACCURACY_SHARE_BPS) / 10000;
        uint256 calibrationPrize = (distributablePool * CALIBRATION_SHARE_BPS) / 10000;

        round.winners[0].prize = convictionPrize;
        round.winners[1].prize = accuracyPrize;
        round.winners[2].prize = calibrationPrize;

        // Transfer prizes using call (safer than transfer)
        (bool s1,) = round.winners[0].addr.call{value: convictionPrize}("");
        (bool s2,) = round.winners[1].addr.call{value: accuracyPrize}("");
        (bool s3,) = round.winners[2].addr.call{value: calibrationPrize}("");
        (bool s4,) = treasury.call{value: platformFee}("");
        
        if (!s1 || !s2 || !s3 || !s4) revert TransferFailed();
        
        totalFeesCollected += platformFee;

        emit WinnerDeclared(roundId, WinnerCategory.Conviction, round.winners[0].addr, convictionPrize);
        emit WinnerDeclared(roundId, WinnerCategory.Accuracy, round.winners[1].addr, accuracyPrize);
        emit WinnerDeclared(roundId, WinnerCategory.Calibration, round.winners[2].addr, calibrationPrize);
    }

    function _absDiff(uint32 a, uint32 b) internal pure returns (uint256) {
        return a >= b ? uint256(a - b) : uint256(b - a);
    }

    function _absDiff256(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a - b : b - a;
    }

    receive() external payable {}
}
