import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get treasury from env, fallback to deployer if not set
  const treasury = process.env.TREASURY_ADDRESS || deployer;

  if (!treasury || treasury === "0x0000000000000000000000000000000000000000") {
    throw new Error("TREASURY_ADDRESS must be set in .env file");
  }

  console.log("Deploying PrivLottery with deployer:", deployer);
  console.log("Treasury address:", treasury);

  const privLottery = await deploy("PrivLottery", {
    from: deployer,
    args: [treasury],
    log: true,
    autoMine: true,
  });

  console.log("PrivLottery deployed to:", privLottery.address);
};

export default func;
func.tags = ["PrivLottery"];
