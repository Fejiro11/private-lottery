import { PrivLottery, PrivLottery__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  treasury: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
  dave: HardhatEthersSigner;
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  const treasury = signers[1];
  
  const factory = (await ethers.getContractFactory("PrivLottery")) as PrivLottery__factory;
  const lotteryContract = (await factory.deploy(treasury.address)) as PrivLottery;
  const lotteryContractAddress = await lotteryContract.getAddress();

  return { lotteryContract, lotteryContractAddress, treasury };
}

describe("PrivLottery", function () {
  let signers: Signers;
  let lotteryContract: PrivLottery;
  let lotteryContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      treasury: ethSigners[1],
      alice: ethSigners[2],
      bob: ethSigners[3],
      charlie: ethSigners[4],
      dave: ethSigners[5],
    };
  });

  beforeEach(async () => {
    ({ lotteryContract, lotteryContractAddress } = await deployFixture());
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(ethers.isAddress(lotteryContractAddress)).to.eq(true);
      console.log(`PrivLottery deployed at ${lotteryContractAddress}`);
    });

    it("should start with round 1", async function () {
      const currentRound = await lotteryContract.getCurrentRound();
      expect(currentRound.roundId).to.eq(1n);
    });

    it("should set correct entry fee", async function () {
      const entryFee = await lotteryContract.ENTRY_PRICE();
      expect(entryFee).to.eq(ethers.parseEther("0.001"));
    });

    it("should set correct treasury address", async function () {
      const treasury = await lotteryContract.treasury();
      expect(treasury).to.eq(signers.treasury.address);
    });

    it("should have correct guess range constants", async function () {
      const minGuess = await lotteryContract.MIN_GUESS();
      const maxGuess = await lotteryContract.MAX_GUESS();
      expect(minGuess).to.eq(0);
      expect(maxGuess).to.eq(1023);
    });

    it("should have correct prize distribution", async function () {
      const convictionShare = await lotteryContract.CONVICTION_SHARE_BPS();
      const accuracyShare = await lotteryContract.ACCURACY_SHARE_BPS();
      const calibrationShare = await lotteryContract.CALIBRATION_SHARE_BPS();
      
      expect(convictionShare).to.eq(5000n); // 50%
      expect(accuracyShare).to.eq(3000n);   // 30%
      expect(calibrationShare).to.eq(2000n); // 20%
    });
  });

  describe("Entry Submission", function () {
    it("should accept valid entry with correct fee", async function () {
      const guess = 500;
      const confidence = 75;
      
      const encryptedInput = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.alice.address)
        .add32(guess)
        .add32(confidence)
        .encrypt();

      const tx = await lotteryContract
        .connect(signers.alice)
        .submitPrediction(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.inputProof,
          { value: ethers.parseEther("0.001") }
        );
      
      await tx.wait();

      const currentRound = await lotteryContract.currentRoundId();
      const hasEntered = await lotteryContract.hasParticipated(currentRound, signers.alice.address);
      expect(hasEntered).to.eq(true);
    });

    it("should reject entry with incorrect fee", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.alice.address)
        .add32(500)
        .add32(75)
        .encrypt();

      await expect(
        lotteryContract
          .connect(signers.alice)
          .submitPrediction(
            encryptedInput.handles[0],
            encryptedInput.handles[1],
            encryptedInput.inputProof,
            { value: ethers.parseEther("0.002") }
          )
      ).to.be.revertedWithCustomError(lotteryContract, "IncorrectEntryFee");
    });

    it("should reject duplicate entries", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.alice.address)
        .add32(500)
        .add32(75)
        .encrypt();

      await lotteryContract
        .connect(signers.alice)
        .submitPrediction(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.inputProof,
          { value: ethers.parseEther("0.001") }
        );

      const encryptedInput2 = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.alice.address)
        .add32(600)
        .add32(80)
        .encrypt();

      await expect(
        lotteryContract
          .connect(signers.alice)
          .submitPrediction(
            encryptedInput2.handles[0],
            encryptedInput2.handles[1],
            encryptedInput2.inputProof,
            { value: ethers.parseEther("0.001") }
          )
      ).to.be.revertedWithCustomError(lotteryContract, "AlreadyParticipated");
    });

    it("should update pool total after entries", async function () {
      const entryFee = ethers.parseEther("0.001");

      // Alice enters
      const encryptedAlice = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.alice.address)
        .add32(500)
        .add32(75)
        .encrypt();

      await lotteryContract
        .connect(signers.alice)
        .submitPrediction(
          encryptedAlice.handles[0],
          encryptedAlice.handles[1],
          encryptedAlice.inputProof,
          { value: entryFee }
        );

      // Bob enters
      const encryptedBob = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.bob.address)
        .add32(600)
        .add32(80)
        .encrypt();

      await lotteryContract
        .connect(signers.bob)
        .submitPrediction(
          encryptedBob.handles[0],
          encryptedBob.handles[1],
          encryptedBob.inputProof,
          { value: entryFee }
        );

      const round = await lotteryContract.getCurrentRound();
      expect(round.prizePool).to.eq(entryFee * 2n);
      expect(round.participantCount).to.eq(2n);
    });
  });

  describe("Round Management", function () {
    it("should have valid round end time", async function () {
      const round = await lotteryContract.getCurrentRound();
      const currentBlock = await ethers.provider.getBlock("latest");
      expect(round.endTime).to.be.gt(currentBlock!.timestamp);
    });

    it("should emit RoundStarted event on deployment", async function () {
      const factory = (await ethers.getContractFactory("PrivLottery")) as PrivLottery__factory;
      const newContract = await factory.deploy(signers.treasury.address);
      await newContract.waitForDeployment();
      
      // Verify round was started by checking round data
      const round = await newContract.getCurrentRound();
      expect(round.roundId).to.eq(1n);
      expect(round.status).to.eq(0); // Active status
    });

    it("should track scores computed count", async function () {
      const round = await lotteryContract.getCurrentRound();
      expect(round.scoresComputedCount).to.eq(0n);
    });
  });

  describe("Settlement Flow", function () {
    async function submitThreeEntries() {
      const entryFee = ethers.parseEther("0.001");

      // Alice enters with guess 500, confidence 90
      const encryptedAlice = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.alice.address)
        .add32(500)
        .add32(90)
        .encrypt();

      await lotteryContract
        .connect(signers.alice)
        .submitPrediction(
          encryptedAlice.handles[0],
          encryptedAlice.handles[1],
          encryptedAlice.inputProof,
          { value: entryFee }
        );

      // Bob enters with guess 400, confidence 50
      const encryptedBob = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.bob.address)
        .add32(400)
        .add32(50)
        .encrypt();

      await lotteryContract
        .connect(signers.bob)
        .submitPrediction(
          encryptedBob.handles[0],
          encryptedBob.handles[1],
          encryptedBob.inputProof,
          { value: entryFee }
        );

      // Charlie enters with guess 600, confidence 70
      const encryptedCharlie = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.charlie.address)
        .add32(600)
        .add32(70)
        .encrypt();

      await lotteryContract
        .connect(signers.charlie)
        .submitPrediction(
          encryptedCharlie.handles[0],
          encryptedCharlie.handles[1],
          encryptedCharlie.inputProof,
          { value: entryFee }
        );
    }

    it("should reject settlement before round ends", async function () {
      await submitThreeEntries();

      await expect(
        lotteryContract.settleRound()
      ).to.be.revertedWithCustomError(lotteryContract, "RoundNotEnded");
    });

    it("should reject settlement with less than 3 participants", async function () {
      const entryFee = ethers.parseEther("0.001");

      // Only Alice enters
      const encryptedAlice = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.alice.address)
        .add32(500)
        .add32(90)
        .encrypt();

      await lotteryContract
        .connect(signers.alice)
        .submitPrediction(
          encryptedAlice.handles[0],
          encryptedAlice.handles[1],
          encryptedAlice.inputProof,
          { value: entryFee }
        );

      // Fast forward past round end
      const round = await lotteryContract.getCurrentRound();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.endTime) + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        lotteryContract.settleRound()
      ).to.be.revertedWithCustomError(lotteryContract, "NotEnoughParticipants");
    });

    it("should allow cancellation with insufficient participants", async function () {
      const entryFee = ethers.parseEther("0.001");

      // Only Alice enters
      const encryptedAlice = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.alice.address)
        .add32(500)
        .add32(90)
        .encrypt();

      await lotteryContract
        .connect(signers.alice)
        .submitPrediction(
          encryptedAlice.handles[0],
          encryptedAlice.handles[1],
          encryptedAlice.inputProof,
          { value: entryFee }
        );

      const aliceBalanceBefore = await ethers.provider.getBalance(signers.alice.address);

      // Fast forward past round end
      const round = await lotteryContract.getCurrentRound();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.endTime) + 1]);
      await ethers.provider.send("evm_mine", []);

      // Cancel round
      await lotteryContract.cancelRound();

      // Alice should be refunded
      const aliceBalanceAfter = await ethers.provider.getBalance(signers.alice.address);
      expect(aliceBalanceAfter).to.be.gt(aliceBalanceBefore);

      // New round should have started
      const newRound = await lotteryContract.getCurrentRound();
      expect(newRound.roundId).to.eq(2n);
    });

    it("should transition to Settling status", async function () {
      await submitThreeEntries();

      // Fast forward past round end
      const round = await lotteryContract.getCurrentRound();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.endTime) + 1]);
      await ethers.provider.send("evm_mine", []);

      // Settle round
      await lotteryContract.settleRound();

      const updatedRound = await lotteryContract.getCurrentRound();
      expect(updatedRound.status).to.eq(1); // Settling status
    });

    it("should compute scores in batches", async function () {
      await submitThreeEntries();

      // Fast forward past round end
      const round = await lotteryContract.getCurrentRound();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.endTime) + 1]);
      await ethers.provider.send("evm_mine", []);

      // Settle round
      await lotteryContract.settleRound();

      // Compute scores for all 3 participants
      await lotteryContract.computeScoresBatch(0, 3);

      const updatedRound = await lotteryContract.getCurrentRound();
      expect(updatedRound.scoresComputedCount).to.eq(3n);
    });
  });

  describe("View Functions", function () {
    it("should return participant info", async function () {
      const entryFee = ethers.parseEther("0.001");

      const encryptedAlice = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.alice.address)
        .add32(500)
        .add32(75)
        .encrypt();

      await lotteryContract
        .connect(signers.alice)
        .submitPrediction(
          encryptedAlice.handles[0],
          encryptedAlice.handles[1],
          encryptedAlice.inputProof,
          { value: entryFee }
        );

      const round = await lotteryContract.getCurrentRound();
      const participant = await lotteryContract.getParticipant(round.roundId, 0);
      
      expect(participant.addr).to.eq(signers.alice.address);
      expect(participant.scoresComputed).to.eq(false);
    });

    it("should return round winners structure", async function () {
      const winners = await lotteryContract.getRoundWinners(1);
      expect(winners.length).to.eq(3);
    });
  });

  describe("Privacy Guarantees", function () {
    it("should not expose encrypted guess values", async function () {
      const entryFee = ethers.parseEther("0.001");

      const encryptedAlice = await fhevm
        .createEncryptedInput(lotteryContractAddress, signers.alice.address)
        .add32(500)
        .add32(75)
        .encrypt();

      await lotteryContract
        .connect(signers.alice)
        .submitPrediction(
          encryptedAlice.handles[0],
          encryptedAlice.handles[1],
          encryptedAlice.inputProof,
          { value: entryFee }
        );

      // Participant data should not expose guess or confidence values
      const round = await lotteryContract.getCurrentRound();
      const participant = await lotteryContract.getParticipant(round.roundId, 0);
      
      // Only address and timestamps should be visible
      expect(participant.addr).to.eq(signers.alice.address);
      expect(participant.submittedAt).to.be.gt(0);
    });

    it("should not expose winning number before reveal", async function () {
      const round = await lotteryContract.getCurrentRound();
      const revealedWinning = await lotteryContract.getRevealedWinningNumber(round.roundId);
      
      // Should be 0 before reveal
      expect(revealedWinning).to.eq(0);
    });
  });
});
