import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import hardhatIgnitionEthers from "@nomicfoundation/hardhat-ignition-ethers";
import "dotenv/config";

function getAccounts(): `0x${string}`[] {
  const key = process.env.PRIVATE_KEY;

  if (!key) return [];

  const clean = key.startsWith("0x")
    ? key
    : `0x${key}`;

  if (!/^0x[0-9a-fA-F]{64}$/.test(clean))
    return [];

  return [clean as `0x${string}`];
}

export default defineConfig({
  plugins: [
    hardhatToolboxMochaEthers,
    hardhatIgnitionEthers,
  ],

  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    hardhat: {
      type: "edr-simulated",
    },

    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL ?? "",
      accounts: getAccounts(),
      chainId: 11155111,
    },
  },
});