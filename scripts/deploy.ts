import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;

  console.log("Deploying PrivLottery with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  console.log("Treasury address:", treasury);

  const PrivLottery = await ethers.getContractFactory("PrivLottery");
  
  console.log("Deploying contract...");
  const lottery = await PrivLottery.deploy(treasury, {
    gasLimit: 8000000,
  });

  await lottery.waitForDeployment();
  const address = await lottery.getAddress();

  console.log("PrivLottery deployed to:", address);
  console.log("\nUpdate frontend/src/lib/constants.ts with:");
  console.log(`export const CONTRACT_ADDRESS = "${address}";`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
