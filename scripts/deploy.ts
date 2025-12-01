import hre from "hardhat";

async function main() {
  // Connect to the network and get viem helpers
  const { viem } = await hre.network.connect();

  // Deploy ProjectFactory first
  const ProjectFactory = await viem.deployContract("ProjectFactory");
  console.log(`ProjectFactory deployed to: ${ProjectFactory.address}`);

  // If you need to deploy the Project implementation separately
  const Project = await viem.deployContract("Project");
  console.log(`Project implementation deployed to: ${Project.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error in deployment:", err);
    process.exit(1);
  });
