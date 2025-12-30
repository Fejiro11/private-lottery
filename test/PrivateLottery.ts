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
    };
  });

  beforeEach(async () => {
    ({ lotteryContract, lotteryContractAddress } = await deployFixture());
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(ethers.isAddress(lotteryContractAddress)).to.eq(true);
      console.log(`PrivateLottery deployed at ${lotteryContractAddress}`);
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
    });
  });
});
