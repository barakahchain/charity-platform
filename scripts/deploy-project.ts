import hre from "hardhat";

async function main() {
  const { viem } = await hre.network.connect();

  const Project = await viem.deployContract("Project");
  console.log(`✅ New Project implementation deployed at: ${Project.address}`);
}

main().catch((err) => {
  console.error("❌ Deployment error:", err);
  process.exit(1);
});
