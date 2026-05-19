// test/DocVault.ts
import { network } from "hardhat";
import type { NetworkConnection } from "hardhat/types/network";
import { expect } from "chai";
import { parseEther } from "ethers";

// ─── Fixture function — nhận connection, KHÔNG anonymous ─────────────────────
// Hardhat 3: fixture nhận connection object, trả về contracts + signers
async function deployFixture(connection: NetworkConnection) {
  const { ethers } = connection;

  const [owner, user1, user2, platform] = await ethers.getSigners();

  const Storage = await ethers.getContractFactory("DocVaultStorage");
  const storage = await Storage.deploy();

  const Access = await ethers.getContractFactory("DocVaultAccess");
  const access = await Access.deploy(await storage.getAddress());

  const Payment = await ethers.getContractFactory("DocVaultPayment");
  const payment = await Payment.deploy(
    await storage.getAddress(),
    await access.getAddress(),
    platform.address,
  );

  const Signing = await ethers.getContractFactory("DocVaultSigning");
  const signing = await Signing.deploy(await storage.getAddress());

  const NFT = await ethers.getContractFactory("DocNFT");
  const nft = await NFT.deploy(await storage.getAddress());

  return {
    ethers,
    storage, access, payment, signing, nft,
    owner, user1, user2, platform,
    TEST_CID: "QmTestCID123abc",
    TEST_ID:  "uuid-offchain-001",
  };
}

// ─── Helper tạo connection + loadFixture ─────────────────────────────────────
// Hardhat 3: mỗi describe block tạo 1 connection riêng
async function setup() {
  const connection = await network.create();
  return connection.networkHelpers.loadFixture(deployFixture);
}

// ─── DocVaultStorage ──────────────────────────────────────────────────────────

describe("DocVaultStorage", function () {
  it("should store a document and emit event", async function () {
    const { storage, owner, TEST_CID, TEST_ID } = await setup();

    await expect(storage.storeDocument(TEST_CID, TEST_ID, true, false, 1))
      .to.emit(storage, "DocumentStored");

    const doc = await storage.getDocument(TEST_CID);
    expect(doc.cid).to.equal(TEST_CID);
    expect(doc.owner.toLowerCase()).to.equal(owner.address.toLowerCase());
    expect(doc.aiVerified).to.equal(true);
  });

  it("should revert on duplicate CID", async function () {
    const { storage, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);

    await expect(
      storage.storeDocument(TEST_CID, TEST_ID, true, false, 1)
    ).to.be.revertedWithCustomError(storage, "CIDAlreadyExists");
  });

  it("should revert on empty CID", async function () {
    const { storage, TEST_ID } = await setup();

    await expect(
      storage.storeDocument("", TEST_ID, true, false, 1)
    ).to.be.revertedWithCustomError(storage, "EmptyCID");
  });

  it("totalDocuments increments after store", async function () {
    const { storage, TEST_CID, TEST_ID } = await setup();

    const before = await storage.totalDocuments();
    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);
    const after = await storage.totalDocuments();

    expect(after).to.equal(before + 1n);
  });

  it("owner can get their CID list", async function () {
    const { storage, owner, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);
    const cids = await storage.getOwnerCIDs(owner.address);

    expect(cids).to.include(TEST_CID);
  });
});

// ─── DocVaultAccess ───────────────────────────────────────────────────────────

describe("DocVaultAccess", function () {
  it("owner always has access", async function () {
    const { storage, access, owner, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);

    expect(
      await access.hasValidAccess(TEST_CID, owner.address)
    ).to.equal(true);
  });

  it("should grant time-limited access to user1", async function () {
    const { storage, access, user1, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);

    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 86400 * 7);
    await access.grantAccess(TEST_CID, user1.address, expiresAt, true);

    expect(
      await access.hasValidAccess(TEST_CID, user1.address)
    ).to.equal(true);
  });

  it("should revoke access", async function () {
    const { storage, access, user1, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);

    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 86400);
    await access.grantAccess(TEST_CID, user1.address, expiresAt, false);
    await access.revokeAccess(TEST_CID, user1.address);

    expect(
      await access.hasValidAccess(TEST_CID, user1.address)
    ).to.equal(false);
  });

  it("user without grant has no access", async function () {
    const { storage, access, user2, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);

    expect(
      await access.hasValidAccess(TEST_CID, user2.address)
    ).to.equal(false);
  });
});

// ─── DocVaultPayment ──────────────────────────────────────────────────────────

describe("DocVaultPayment", function () {
  it("should purchase access and transfer funds", async function () {
    const { storage, payment, user1, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, true, 1);

    const price = parseEther("1.0");
    await payment.setPrice(TEST_CID, price);

    await expect(
      payment.connect(user1).purchaseAccess(TEST_CID, { value: price })
    ).to.emit(payment, "AccessPurchased");
  });

  it("should revert if payment is insufficient", async function () {
    const { storage, payment, user1, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, true, 1);
    await payment.setPrice(TEST_CID, parseEther("1.0"));

    await expect(
      payment.connect(user1).purchaseAccess(TEST_CID, {
        value: parseEther("0.5"),
      })
    ).to.be.revertedWithCustomError(payment, "InsufficientPayment");
  });

  it("should revert buying doc not for sale", async function () {
    const { storage, payment, user1, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);

    await expect(
      payment.connect(user1).purchaseAccess(TEST_CID, {
        value: parseEther("1.0"),
      })
    ).to.be.revertedWithCustomError(payment, "DocumentNotForSale");
  });
});

// ─── DocVaultSigning ──────────────────────────────────────────────────────────

describe("DocVaultSigning", function () {
  it("should create session, collect 2 sigs, auto-finalize", async function () {
    const { storage, signing, user1, user2, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 3);

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);
    await signing.createSigningSession(
      TEST_CID,
      [user1.address, user2.address],
      deadline,
    );

    const sessionId = 1n;

    // user1 ký
    const sig1 = await user1.signMessage(
      `Sign DocVault session ${sessionId}`
    );
    await signing.connect(user1).sign(sessionId, sig1);

    // user2 ký → auto FINALIZED
    const sig2 = await user2.signMessage(
      `Sign DocVault session ${sessionId}`
    );
    await expect(signing.connect(user2).sign(sessionId, sig2))
      .to.emit(signing, "SessionFinalized");

    const session = await signing.getSession(sessionId);
    expect(session.status).to.equal(1n); // 1 = FINALIZED
  });

  it("stranger cannot sign", async function () {
    const { storage, signing, owner, user2, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 3);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);

    // session chỉ cần user2 ký
    await signing.createSigningSession(TEST_CID, [user2.address], deadline);

    // owner cố ký — không phải signer → revert
    const fakeSig = await owner.signMessage("fake");
    await expect(
      signing.sign(1n, fakeSig) // owner là msg.sender mặc định
    ).to.be.revertedWithCustomError(signing, "NotRequiredSigner");
  });
});

// ─── DocNFT ───────────────────────────────────────────────────────────────────

describe("DocNFT", function () {
  it("should mint soul-bound NFT", async function () {
    const { storage, nft, owner, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);

    await expect(nft.mintOwnershipNFT(TEST_CID))
      .to.emit(nft, "Minted");

    expect(
      (await nft.ownerOf(1n)).toLowerCase()
    ).to.equal(owner.address.toLowerCase());
  });

  it("cannot mint twice for same CID", async function () {
    const { storage, nft, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);
    await nft.mintOwnershipNFT(TEST_CID);

    await expect(
      nft.mintOwnershipNFT(TEST_CID)
    ).to.be.revertedWithCustomError(nft, "AlreadyMinted");
  });

  it("should block all transfers (soul-bound)", async function () {
    const { storage, nft, owner, user1, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);
    await nft.mintOwnershipNFT(TEST_CID);

    await expect(
      nft.transferFrom(owner.address, user1.address, 1n)
    ).to.be.revertedWithCustomError(nft, "Soulbound");
  });

  it("tokenURI returns on-chain metadata", async function () {
    const { storage, nft, TEST_CID, TEST_ID } = await setup();

    await storage.storeDocument(TEST_CID, TEST_ID, true, false, 1);
    await nft.mintOwnershipNFT(TEST_CID);

    const uri = await nft.tokenURI(1n);
    expect(uri).to.include("data:application/json");
    expect(uri).to.include(TEST_CID);
  });
});