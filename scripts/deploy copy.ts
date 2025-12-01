// import hre from "hardhat";

// async function main() {
//   // Connect to the network and get viem helpers
//   const { viem } = await hre.network.connect();

//   // Deploy your contract
//   // The first argument is the contract name (as compiled by Hardhat),
//   // the second is constructor args (if any),
//   // and you can also pass a `value` or other options.
//   const charity = await viem.deployContract("CharityEscrow" /* name of your contract */,
//     [] /* constructor args, if any */);

//   console.log("CharityEscrow deployed at:", charity.address);

//   // Optionally you can call initialization or setup
//   // e.g. await charity.write.initialize([...]);
// }

// main()
//   .then(() => process.exit(0))
//   .catch((err) => {
//     console.error("Error in deployment:", err);
//     process.exit(1);
//   });
