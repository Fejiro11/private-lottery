// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PrivLottery
 * @notice A privacy-first lottery using Fully Homomorphic Encryption
 * @dev All guesses, confidence values, and scores remain encrypted until settlement.
 *      Scoring logic runs entirely under encryption using FHE operations.
 * 
 * Winner Categories:
 * 1. Conviction Weighted - Best combination of accuracy and confidence (50%)
 * 2. Raw Accuracy - Closest guess regardless of confidence (30%)
 * 3. Best Calibrated - Confidence most closely matched actual error (20%)
 * 
 * Privacy Guarantees:
 * - During round: All values encrypted, submissions look identical on-chain
 * - At settlement: Only winner information is revealed
 * - Scoring: Computed under encryption using FHE.sub, FHE.mul, FHE.lt, FHE.select
 */
contract PrivLottery is ZamaEthereumConfig {
    // ============ Constants ============
    uint256 public constant ROUND_DURATION = 1 hours;
    uint256 public constant ENTRY_PRICE = 0.001 ether;
    uint256 public constant MAX_PARTICIPANTS = 100;
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint32 public constant MIN_GUESS = 0;
    uint32 public constant MAX_GUESS = 1023;
    uint32 public constant MAX_CONFIDENCE = 100;
    
    // Prize distribution in basis points
    uint256 public constant CONVICTION_SHARE_BPS = 5000; // 50%
    uint256 public constant ACCURACY_SHARE_BPS = 3000;   // 30%
    uint256 public constant CALIBRATION_SHARE_BPS = 2000; // 20%

    // ============ Enums ============
    enum RoundStatus { Active, Settling, Completed, Cancelled }
    enum WinnerCategory { Conviction, Accuracy, Calibration }

    // ============ Structs ============
    struct Participant {
        address addr;
        euint32 encryptedGuess;
        euint32 encryptedConfidence;
        // Encrypted scores computed at settlement
        euint32 encryptedDistance;
        euint32 encryptedConvictionScore;
        euint32 encryptedCalibrationError;
        uint256 submittedAt;
        bool scoresComputed;
    }

    struct Winner {
        address addr;
        WinnerCategory category;
        uint256 prize;
        uint32 guess;
        uint32 confidence;
        uint32 distance;
        uint32 score;
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
        uint256 scoresComputedCount;
        // Encrypted winner tracking
        euint32 bestConvictionIdx;
        euint32 bestConvictionScore;
        euint32 bestAccuracyIdx;
        euint32 bestAccuracyDistance; // Lower is better
        euint32 bestCalibrationIdx;
        euint32 bestCalibrationError; // Lower is better
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
    event ScoresComputed(uint256 indexed roundId, uint256 batchStart, uint256 batchEnd);
    event RoundSettling(uint256 indexed roundId);
    event WinnerDeclared(uint256 indexed roundId, WinnerCategory category, address winner, uint256 prize);
    event RoundCompleted(uint256 indexed roundId, uint32 winningNumber);
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
    error ScoresNotComputed();
    error InvalidProof();
    error TransferFailed();
    error InvalidBatch();

    // ============ Constructor ============
    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        _startNewRound();
    }

    // ============ External Functions ============

    /**
     * @notice Submit an encrypted guess and confidence level
     * @param encryptedGuess The encrypted guess (0-1023)
     * @param encryptedConfidence The encrypted confidence level (0-100)
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

        // Store participant data (scores computed later during settlement)
        uint256 participantIndex = round.participantCount;
        participants[currentRoundId][participantIndex] = Participant({
            addr: msg.sender,
            encryptedGuess: guess,
            encryptedConfidence: confidence,
            encryptedDistance: FHE.asEuint32(0),
            encryptedConvictionScore: FHE.asEuint32(0),
            encryptedCalibrationError: FHE.asEuint32(0),
            submittedAt: block.timestamp,
            scoresComputed: false
        });

        // Update round state
        round.participantCount++;
        round.prizePool += msg.value;
        hasParticipated[currentRoundId][msg.sender] = true;

        // Grant ACL permissions for later operations
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
     * @notice Begin settlement phase when round ends
     */
    function settleRound() external {
        Round storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Active) revert RoundNotActive();
        if (block.timestamp < round.endTime) revert RoundNotEnded();
        if (round.participantCount < 3) revert NotEnoughParticipants();

        round.status = RoundStatus.Settling;
        
        // Initialize encrypted winner tracking
        // Use max values for "lower is better" metrics (distance, calibration)
        round.bestConvictionScore = FHE.asEuint32(0);
        round.bestConvictionIdx = FHE.asEuint32(0);
        round.bestAccuracyDistance = FHE.asEuint32(MAX_GUESS + 1);
        round.bestAccuracyIdx = FHE.asEuint32(0);
        round.bestCalibrationError = FHE.asEuint32(MAX_CONFIDENCE + 1);
        round.bestCalibrationIdx = FHE.asEuint32(0);
        
        FHE.allowThis(round.bestConvictionScore);
        FHE.allowThis(round.bestConvictionIdx);
        FHE.allowThis(round.bestAccuracyDistance);
        FHE.allowThis(round.bestAccuracyIdx);
        FHE.allowThis(round.bestCalibrationError);
        FHE.allowThis(round.bestCalibrationIdx);

        emit RoundSettling(currentRoundId);
    }

    /**
     * @notice Compute encrypted scores for a batch of participants
     * @dev Scores are computed under encryption using FHE operations
     * @param batchStart Starting index of batch
     * @param batchSize Number of participants to process
     */
    function computeScoresBatch(uint256 batchStart, uint256 batchSize) external {
        Round storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Settling) revert RoundNotSettling();
        
        uint256 batchEnd = batchStart + batchSize;
        if (batchEnd > round.participantCount) {
            batchEnd = round.participantCount;
        }
        if (batchStart >= batchEnd) revert InvalidBatch();

        euint32 winningNum = round.encryptedWinningNumber;

        for (uint256 i = batchStart; i < batchEnd; i++) {
            Participant storage p = participants[currentRoundId][i];
            
            if (p.scoresComputed) continue;

            // Compute encrypted distance: |guess - winningNumber|
            // Since we can't know which is larger, compute both and select
            ebool guessIsLarger = FHE.ge(p.encryptedGuess, winningNum);
            euint32 diff1 = FHE.sub(p.encryptedGuess, winningNum);
            euint32 diff2 = FHE.sub(winningNum, p.encryptedGuess);
            euint32 distance = FHE.select(guessIsLarger, diff1, diff2);
            
            // Raw score: MAX_GUESS - distance (higher is better)
            euint32 rawScore = FHE.sub(FHE.asEuint32(MAX_GUESS), distance);
            
            // Conviction score: rawScore * confidence / 100
            // Simplified: (rawScore * confidence) to avoid division issues
            euint32 convictionScore = FHE.mul(rawScore, p.encryptedConfidence);
            
            // Accuracy percentage: (rawScore * 100) / MAX_GUESS
            // Simplified for FHE: rawScore * 100 / 1024 ≈ rawScore / 10
            // Actually, let's use: accuracyPct = rawScore * 100 / MAX_GUESS
            // Since MAX_GUESS = 1023 ≈ 1024, we can approximate
            // For calibration: |confidence - (rawScore * 100 / 1023)|
            // Simplified: store rawScore, compute calibration as |confidence*10 - rawScore|
            euint32 scaledRawScore = FHE.mul(rawScore, FHE.asEuint32(100));
            euint32 normalizedScore = FHE.div(scaledRawScore, MAX_GUESS);
            
            // Calibration error: |confidence - normalizedScore|
            ebool confIsLarger = FHE.ge(p.encryptedConfidence, normalizedScore);
            euint32 calDiff1 = FHE.sub(p.encryptedConfidence, normalizedScore);
            euint32 calDiff2 = FHE.sub(normalizedScore, p.encryptedConfidence);
            euint32 calibrationError = FHE.select(confIsLarger, calDiff1, calDiff2);

            // Store encrypted scores
            p.encryptedDistance = distance;
            p.encryptedConvictionScore = convictionScore;
            p.encryptedCalibrationError = calibrationError;
            p.scoresComputed = true;
            
            FHE.allowThis(distance);
            FHE.allowThis(convictionScore);
            FHE.allowThis(calibrationError);

            // Update encrypted winner tracking
            euint32 currentIdx = FHE.asEuint32(uint32(i));
            
            // Best conviction (higher is better)
            ebool isBetterConviction = FHE.gt(convictionScore, round.bestConvictionScore);
            round.bestConvictionScore = FHE.select(isBetterConviction, convictionScore, round.bestConvictionScore);
            round.bestConvictionIdx = FHE.select(isBetterConviction, currentIdx, round.bestConvictionIdx);
            FHE.allowThis(round.bestConvictionScore);
            FHE.allowThis(round.bestConvictionIdx);
            
            // Best accuracy (lower distance is better)
            ebool isBetterAccuracy = FHE.lt(distance, round.bestAccuracyDistance);
            round.bestAccuracyDistance = FHE.select(isBetterAccuracy, distance, round.bestAccuracyDistance);
            round.bestAccuracyIdx = FHE.select(isBetterAccuracy, currentIdx, round.bestAccuracyIdx);
            FHE.allowThis(round.bestAccuracyDistance);
            FHE.allowThis(round.bestAccuracyIdx);
            
            // Best calibration (lower error is better)
            ebool isBetterCalibration = FHE.lt(calibrationError, round.bestCalibrationError);
            round.bestCalibrationError = FHE.select(isBetterCalibration, calibrationError, round.bestCalibrationError);
            round.bestCalibrationIdx = FHE.select(isBetterCalibration, currentIdx, round.bestCalibrationIdx);
            FHE.allowThis(round.bestCalibrationError);
            FHE.allowThis(round.bestCalibrationIdx);

            round.scoresComputedCount++;
        }

        emit ScoresComputed(currentRoundId, batchStart, batchEnd);
    }

    /**
     * @notice Request decryption of winner indices after scores are computed
     */
    function requestWinnerReveal() external {
        Round storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Settling) revert RoundNotSettling();
        if (round.scoresComputedCount < round.participantCount) revert ScoresNotComputed();

        // Make winning number and winner indices publicly decryptable
        FHE.makePubliclyDecryptable(round.encryptedWinningNumber);
        FHE.makePubliclyDecryptable(round.bestConvictionIdx);
        FHE.makePubliclyDecryptable(round.bestAccuracyIdx);
        FHE.makePubliclyDecryptable(round.bestCalibrationIdx);
    }

    /**
     * @notice Finalize round with decrypted winner information
     * @param winningNumber The decrypted winning number
     * @param convictionWinnerIdx Index of conviction winner
     * @param accuracyWinnerIdx Index of accuracy winner
     * @param calibrationWinnerIdx Index of calibration winner
     * @param winnerGuesses Array of winner guesses [conviction, accuracy, calibration]
     * @param winnerConfidences Array of winner confidences
     * @param winnerDistances Array of winner distances
     * @param decryptionProof Combined proof from KMS
     */
    function finalizeRound(
        uint32 winningNumber,
        uint32 convictionWinnerIdx,
        uint32 accuracyWinnerIdx,
        uint32 calibrationWinnerIdx,
        uint32[3] calldata winnerGuesses,
        uint32[3] calldata winnerConfidences,
        uint32[3] calldata winnerDistances,
        bytes calldata decryptionProof
    ) external {
        Round storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Settling) revert RoundNotSettling();
        if (round.scoresComputedCount < round.participantCount) revert ScoresNotComputed();

        // Build handles array for verification
        // Order: winningNumber, convictionIdx, accuracyIdx, calibrationIdx,
        //        then for each winner: guess, confidence, distance
        bytes32[] memory handles = new bytes32[](13);
        handles[0] = FHE.toBytes32(round.encryptedWinningNumber);
        handles[1] = FHE.toBytes32(round.bestConvictionIdx);
        handles[2] = FHE.toBytes32(round.bestAccuracyIdx);
        handles[3] = FHE.toBytes32(round.bestCalibrationIdx);
        
        // Winner data handles
        Participant storage pConviction = participants[currentRoundId][convictionWinnerIdx];
        Participant storage pAccuracy = participants[currentRoundId][accuracyWinnerIdx];
        Participant storage pCalibration = participants[currentRoundId][calibrationWinnerIdx];
        
        // Make winner data decryptable
        FHE.makePubliclyDecryptable(pConviction.encryptedGuess);
        FHE.makePubliclyDecryptable(pConviction.encryptedConfidence);
        FHE.makePubliclyDecryptable(pConviction.encryptedDistance);
        FHE.makePubliclyDecryptable(pAccuracy.encryptedGuess);
        FHE.makePubliclyDecryptable(pAccuracy.encryptedConfidence);
        FHE.makePubliclyDecryptable(pAccuracy.encryptedDistance);
        FHE.makePubliclyDecryptable(pCalibration.encryptedGuess);
        FHE.makePubliclyDecryptable(pCalibration.encryptedConfidence);
        FHE.makePubliclyDecryptable(pCalibration.encryptedDistance);
        
        handles[4] = FHE.toBytes32(pConviction.encryptedGuess);
        handles[5] = FHE.toBytes32(pConviction.encryptedConfidence);
        handles[6] = FHE.toBytes32(pConviction.encryptedDistance);
        handles[7] = FHE.toBytes32(pAccuracy.encryptedGuess);
        handles[8] = FHE.toBytes32(pAccuracy.encryptedConfidence);
        handles[9] = FHE.toBytes32(pAccuracy.encryptedDistance);
        handles[10] = FHE.toBytes32(pCalibration.encryptedGuess);
        handles[11] = FHE.toBytes32(pCalibration.encryptedConfidence);
        handles[12] = FHE.toBytes32(pCalibration.encryptedDistance);

        // Encode cleartext values
        bytes memory abiEncoded = abi.encode(
            winningNumber,
            convictionWinnerIdx,
            accuracyWinnerIdx,
            calibrationWinnerIdx,
            winnerGuesses[0], winnerConfidences[0], winnerDistances[0],
            winnerGuesses[1], winnerConfidences[1], winnerDistances[1],
            winnerGuesses[2], winnerConfidences[2], winnerDistances[2]
        );
        
        // Verify decryption proof
        FHE.checkSignatures(handles, abiEncoded, decryptionProof);

        round.revealedWinningNumber = winningNumber;

        // Handle duplicate winners - promote next best if needed
        uint32[3] memory winnerIndices = [convictionWinnerIdx, accuracyWinnerIdx, calibrationWinnerIdx];
        _handleDuplicateWinners(winnerIndices);

        // Store winners
        _storeWinners(
            currentRoundId,
            winnerIndices,
            winnerGuesses,
            winnerConfidences,
            winnerDistances
        );

        // Distribute prizes
        _distributePrizes(currentRoundId);

        round.status = RoundStatus.Completed;
        round.isSettled = true;

        emit RoundCompleted(currentRoundId, winningNumber);

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
        uint256 participantCount,
        uint256 scoresComputedCount
    ) {
        Round storage round = rounds[currentRoundId];
        return (
            round.roundId,
            round.startTime,
            round.endTime,
            round.status,
            round.prizePool,
            round.participantCount,
            round.scoresComputedCount
        );
    }

    function getRoundWinners(uint256 roundId) external view returns (Winner[3] memory) {
        return rounds[roundId].winners;
    }

    function getParticipant(uint256 roundId, uint256 index) external view returns (
        address addr,
        uint256 submittedAt,
        bool scoresComputed
    ) {
        Participant storage p = participants[roundId][index];
        return (p.addr, p.submittedAt, p.scoresComputed);
    }

    function getRevealedWinningNumber(uint256 roundId) external view returns (uint32) {
        return rounds[roundId].revealedWinningNumber;
    }

    // ============ Internal Functions ============

    function _startNewRound() internal {
        currentRoundId++;
        
        // Generate random winning number using FHE
        euint16 rawRandom = FHE.randEuint16();
        // Mask to 10 bits (0-1023)
        euint16 masked = FHE.and(rawRandom, FHE.asEuint16(1023));
        euint32 encryptedWinning = FHE.asEuint32(masked);
        FHE.allowThis(encryptedWinning);

        Round storage newRound = rounds[currentRoundId];
        newRound.roundId = currentRoundId;
        newRound.startTime = block.timestamp;
        newRound.endTime = block.timestamp + ROUND_DURATION;
        newRound.status = RoundStatus.Active;
        newRound.encryptedWinningNumber = encryptedWinning;
        newRound.revealedWinningNumber = 0;
        newRound.prizePool = 0;
        newRound.participantCount = 0;
        newRound.scoresComputedCount = 0;
        newRound.isSettled = false;

        emit RoundStarted(currentRoundId, block.timestamp, block.timestamp + ROUND_DURATION);
    }

    function _handleDuplicateWinners(uint32[3] memory indices) internal view {
        // If accuracy winner equals conviction winner, they keep conviction (higher priority)
        // For now, we accept duplicates as the off-chain process should handle promotion
        // In production, you'd want to track second-best encrypted values
    }

    function _storeWinners(
        uint256 roundId,
        uint32[3] memory indices,
        uint32[3] calldata guesses,
        uint32[3] calldata confidences,
        uint32[3] calldata distances
    ) internal {
        Round storage round = rounds[roundId];
        
        // Conviction winner
        round.winners[0] = Winner({
            addr: participants[roundId][indices[0]].addr,
            category: WinnerCategory.Conviction,
            prize: 0,
            guess: guesses[0],
            confidence: confidences[0],
            distance: distances[0],
            score: uint32(guesses[0]) * uint32(confidences[0])
        });

        // Accuracy winner
        round.winners[1] = Winner({
            addr: participants[roundId][indices[1]].addr,
            category: WinnerCategory.Accuracy,
            prize: 0,
            guess: guesses[1],
            confidence: confidences[1],
            distance: distances[1],
            score: uint32(MAX_GUESS) - distances[1]
        });

        // Calibration winner
        round.winners[2] = Winner({
            addr: participants[roundId][indices[2]].addr,
            category: WinnerCategory.Calibration,
            prize: 0,
            guess: guesses[2],
            confidence: confidences[2],
            distance: distances[2],
            score: 0 // Calibration is about low error
        });
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

        // Transfer prizes
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

    receive() external payable {}
}
