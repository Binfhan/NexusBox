// contracts/ignition/modules/DocVault.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Ignition deploy module — deploy theo đúng thứ tự dependency:
 *   1. DocVaultStorage  (không phụ thuộc ai)
 *   2. DocVaultAccess   (cần Storage address)
 *   3. DocVaultPayment  (cần Storage + Access address)
 *   4. DocVaultSigning  (cần Storage address)
 *   5. DocNFT           (cần Storage address)
 *
 * LIÊN KẾT:
 *   - Sau khi deploy, copy addresses vào .env của NestJS backend
 *   - NestJS blockchain.service.ts dùng các addresses này để init contracts
 */
const DocVaultModule = buildModule("DocVaultModule", (m) => {

  // Platform wallet nhận 2.5% phí — dùng tham số để dễ config per-network
  const platformWallet = m.getParameter(
    "platformWallet",
    "0x141cd239e0e31bff5bb9c15d10d479945359dbb3"  // thay bằng ví thật khi deploy mainnet
  );

  // 1. Deploy Storage trước — không dependency
  const storage = m.contract("DocVaultStorage");

  // 2. Access cần Storage
  const access = m.contract("DocVaultAccess", [storage]);

  // 3. Payment cần Storage + Access + platform wallet
  const payment = m.contract("DocVaultPayment", [storage, access, platformWallet]);

  // 4. Signing chỉ cần Storage
  const signing = m.contract("DocVaultSigning", [storage]);

  // 5. NFT chỉ cần Storage
  const nft = m.contract("DocNFT", [storage]);

  // export để dùng trong scripts và tests
  return { storage, access, payment, signing, nft };
});

export default DocVaultModule;