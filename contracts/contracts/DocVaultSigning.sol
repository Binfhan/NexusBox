// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DocVaultStorage.sol";

/**
 * @title DocVaultSigning
 * @notice Multi-party document signing — nhiều ví cùng ký 1 tài liệu.
 *         Khi tất cả ký xong → FINALIZED, bất biến on-chain.
 *
 * USE CASE: Hợp đồng freelance, biên bản thỏa thuận giữa các bên
 *           không tin tưởng server trung gian.
 *
 * LUỒNG:
 *   1. Doc owner gọi createSigningSession(cid, [signerA, signerB], deadline)
 *   2. Mỗi signer ký message off-chain bằng MetaMask → nhận signature bytes
 *   3. Signer gọi sign(sessionId, signature)
 *   4. Contract verify signature on-chain (ecrecover)
 *   5. Khi đủ chữ ký → status = FINALIZED, emit SessionFinalized
 *   6. NestJS lắng nghe event SessionFinalized → update DB
 *
 * SECURITY FIXES:
 *   - Verify ECDSA signature on-chain (v1 không verify gì cả)
 *   - O(1) signer lookup bằng mapping (v1 dùng loop O(n))
 *   - Reject duplicate signer khi tạo session
 */
contract DocVaultSigning {

    // =========================================================================
    // SECTION 1: OWNABLE + PAUSABLE
    // =========================================================================

    address public owner;
    bool    public paused;

    event OwnershipTransferred(address indexed previous, address indexed newOwner);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    error OnlyOwner();
    error ContractPaused();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function pause()   external onlyOwner { paused = true;  emit Paused(msg.sender);   }
    function unpause() external onlyOwner { paused = false; emit Unpaused(msg.sender); }


    // =========================================================================
    // SECTION 2: ENUMS & STRUCTS
    // =========================================================================

    enum SessionStatus {
        PENDING,    // đang chờ chữ ký
        FINALIZED,  // đủ chữ ký, bất biến
        CANCELLED   // bị hủy bởi initiator
    }

    struct SigningSession {
        string        cid;
        address       initiator;        // doc owner tạo session
        address[]     requiredSigners;  // danh sách bắt buộc ký
        uint256       deadline;
        SessionStatus status;
        uint256       createdAt;
        uint256       finalizedAt;      // 0 nếu chưa finalize
    }

    struct SignerRecord {
        bool    signed;
        uint256 signedAt;
        bytes   signature; // 65-byte ECDSA signature lưu làm bằng chứng
    }


    // =========================================================================
    // SECTION 3: STORAGE
    // =========================================================================

    DocVaultStorage public immutable storageContract;

    uint256 private _sessionCounter;

    mapping(uint256 => SigningSession) public sessions;
    mapping(uint256 => mapping(address => SignerRecord)) public signerRecords;
    mapping(uint256 => uint256) public signatureCount;
    mapping(string => uint256[]) public cidSessions; // cid → tất cả sessionIds

    /**
     * @notice O(1) lookup thay cho loop trong sign().
     *
     * BUG CŨ (v1):
     *   for (uint256 i = 0; i < session.requiredSigners.length; i++) {
     *       if (session.requiredSigners[i] == msg.sender) { isRequired = true; break; }
     *   }
     *   → O(n): với 50 signers mỗi lần sign tốn ~50 SLOAD = rất tốn gas
     *
     * FIX: mapping → O(1), 1 SLOAD duy nhất
     *
     * sessionId → signer → isRequired
     */
    mapping(uint256 => mapping(address => bool)) public isRequiredSigner;


    // =========================================================================
    // SECTION 4: EVENTS
    // =========================================================================

    event SessionCreated(
        uint256 indexed sessionId,
        string  indexed cid,
        address         initiator,
        address[]       signers,
        uint256         deadline
    );
    event DocumentSigned(uint256 indexed sessionId, address indexed signer, uint256 signedAt);
    event SessionFinalized(uint256 indexed sessionId, string indexed cid, uint256 finalizedAt);
    event SessionCancelled(uint256 indexed sessionId);


    // =========================================================================
    // SECTION 5: ERRORS
    // =========================================================================

    error DocumentNotFound(string cid);
    error NotDocumentOwner(string cid);
    error SessionNotFound(uint256 sessionId);
    error SessionNotPending(uint256 sessionId);
    error NotRequiredSigner(uint256 sessionId, address caller);
    error AlreadySigned(uint256 sessionId, address signer);
    error DeadlinePassed(uint256 sessionId);
    error DeadlineTooShort();
    error NoSignersProvided();
    error InvalidSignature(uint256 sessionId, address claimed); // NEW
    error DuplicateSigner(address signer);                      // NEW


    // =========================================================================
    // SECTION 6: CONSTRUCTOR
    // =========================================================================

    constructor(address storageAddr) {
        storageContract = DocVaultStorage(storageAddr);
        owner = msg.sender;
    }


    // =========================================================================
    // SECTION 7: WRITE FUNCTIONS
    // =========================================================================

    /**
     * @notice Tạo signing session.
     *
     * @dev Build isRequiredSigner mapping ngay khi tạo session:
     *      → sign() sau này chỉ cần 1 SLOAD thay vì loop
     *      → Đồng thời detect duplicate signer trong danh sách đầu vào
     *
     * @param cid      CID tài liệu (phải là owner)
     * @param signers  Danh sách ví bắt buộc ký (không được trùng)
     * @param deadline Unix timestamp — phải ít nhất 1 giờ từ hiện tại
     */
    function createSigningSession(
        string    calldata cid,
        address[] calldata signers,
        uint256            deadline
    ) external whenNotPaused returns (uint256) {
        if (!storageContract.cidExists(cid))             revert DocumentNotFound(cid);
        if (storageContract.getOwner(cid) != msg.sender) revert NotDocumentOwner(cid);
        if (signers.length == 0)                         revert NoSignersProvided();
        if (deadline < block.timestamp + 1 hours)        revert DeadlineTooShort();

        uint256 sessionId = ++_sessionCounter;

        sessions[sessionId] = SigningSession({
            cid:             cid,
            initiator:       msg.sender,
            requiredSigners: signers,
            deadline:        deadline,
            status:          SessionStatus.PENDING,
            createdAt:       block.timestamp,
            finalizedAt:     0
        });

        // Build O(1) lookup + reject duplicate trong cùng 1 loop
        for (uint256 i = 0; i < signers.length; i++) {
            if (isRequiredSigner[sessionId][signers[i]])
                revert DuplicateSigner(signers[i]);
            isRequiredSigner[sessionId][signers[i]] = true;
        }

        cidSessions[cid].push(sessionId);

        emit SessionCreated(sessionId, cid, msg.sender, signers, deadline);
        return sessionId;
    }

    /**
     * @notice Signer ký tài liệu.
     *
     * ─── QUY TRÌNH VERIFY SIGNATURE ──────────────────────────────────
     *
     * Frontend (ethers.js v5) phải ký message theo đúng format:
     *
     *   const innerHash = ethers.utils.solidityKeccak256(
     *     ["string", "uint256", "string", "string"],
     *     ["DocVault:sign:", sessionId, ":", cid]
     *   );
     *   const signature = await signer.signMessage(
     *     ethers.utils.arrayify(innerHash)
     *   );
     *   // ethers.signMessage tự thêm EIP-191 prefix trước khi ký
     *
     * On-chain, _recoverSigner() tái tạo cùng hash và dùng ecrecover
     * để kiểm tra recovered address == msg.sender.
     *
     * Tại sao cần verify on-chain?
     *   v1 chỉ lưu signature bytes mà không kiểm tra gì cả
     *   → bất kỳ ai cũng có thể gọi sign(sessionId, "0x1234")
     *     với 65 byte rác và được ghi nhận là đã ký.
     *
     * ─────────────────────────────────────────────────────────────────
     *
     * @param sessionId  ID session
     * @param signature  65-byte ECDSA signature từ ethers.signMessage()
     */
    function sign(uint256 sessionId, bytes calldata signature) external whenNotPaused {
        SigningSession storage session = sessions[sessionId];

        // ── Checks ────────────────────────────────────────────────────────────
        if (session.createdAt == 0)                      revert SessionNotFound(sessionId);
        if (session.status != SessionStatus.PENDING)     revert SessionNotPending(sessionId);
        if (block.timestamp > session.deadline)          revert DeadlinePassed(sessionId);
        if (!isRequiredSigner[sessionId][msg.sender])    revert NotRequiredSigner(sessionId, msg.sender);
        if (signerRecords[sessionId][msg.sender].signed) revert AlreadySigned(sessionId, msg.sender);

        // ── Verify ECDSA ──────────────────────────────────────────────────────
        address recovered = _recoverSigner(sessionId, session.cid, signature);
        if (recovered != msg.sender) revert InvalidSignature(sessionId, msg.sender);

        // ── Effects ───────────────────────────────────────────────────────────
        signerRecords[sessionId][msg.sender] = SignerRecord({
            signed:    true,
            signedAt:  block.timestamp,
            signature: signature
        });

        signatureCount[sessionId]++;
        emit DocumentSigned(sessionId, msg.sender, block.timestamp);

        // Auto-finalize khi thu đủ chữ ký
        if (signatureCount[sessionId] == session.requiredSigners.length) {
            session.status      = SessionStatus.FINALIZED;
            session.finalizedAt = block.timestamp;
            emit SessionFinalized(sessionId, session.cid, block.timestamp);
        }
    }

    /**
     * @notice Initiator hủy session trước khi finalize.
     */
    function cancelSession(uint256 sessionId) external whenNotPaused {
        SigningSession storage session = sessions[sessionId];
        if (session.createdAt == 0)                  revert SessionNotFound(sessionId);
        if (session.status != SessionStatus.PENDING) revert SessionNotPending(sessionId);
        if (session.initiator != msg.sender)         revert NotDocumentOwner(session.cid);

        session.status = SessionStatus.CANCELLED;
        emit SessionCancelled(sessionId);
    }


    // =========================================================================
    // SECTION 8: INTERNAL — SIGNATURE RECOVERY
    // =========================================================================

    /**
     * @dev Tái tạo message hash và recover địa chỉ từ ECDSA signature.
     *
     * Hash chain:
     *   innerHash = keccak256("DocVault:sign:" + sessionId + ":" + cid)
     *   ethSignedHash = keccak256("\x19Ethereum Signed Message:\n32" + innerHash)
     *     ↑ đây là EIP-191 prefix mà ethers.signMessage() tự thêm
     *
     * Parse signature (65 bytes = r[32] + s[32] + v[1]):
     *   - Dùng assembly để đọc trực tiếp từ calldata — tiết kiệm gas
     *   - v < 27 → cộng thêm 27 (một số wallet không cộng sẵn)
     *
     * @return recovered  Địa chỉ ví đã tạo ra signature này
     */
    function _recoverSigner(
        uint256        sessionId,
        string storage cid,
        bytes calldata signature
    ) internal pure returns (address recovered) {
        bytes32 innerHash = keccak256(
            abi.encodePacked("DocVault:sign:", sessionId, ":", cid)
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", innerHash)
        );

        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8   v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;

        recovered = ecrecover(ethSignedHash, v, r, s);
    }


    // =========================================================================
    // SECTION 9: READ FUNCTIONS
    // =========================================================================

    function getSession(uint256 sessionId) external view returns (SigningSession memory) {
        return sessions[sessionId];
    }

    function getSignerRecord(uint256 sessionId, address signer)
        external view returns (SignerRecord memory)
    {
        return signerRecords[sessionId][signer];
    }

    function getSessionsByCid(string calldata cid) external view returns (uint256[] memory) {
        return cidSessions[cid];
    }

    /**
     * @notice Trạng thái ký của tất cả signers trong 1 session.
     *         NestJS dùng để render progress bar trên UI.
     */
    function getSigningStatus(uint256 sessionId)
        external view
        returns (address[] memory signers, bool[] memory signed)
    {
        SigningSession memory session = sessions[sessionId];
        signers = session.requiredSigners;
        signed  = new bool[](signers.length);
        for (uint256 i = 0; i < signers.length; i++) {
            signed[i] = signerRecords[sessionId][signers[i]].signed;
        }
    }

    /**
     * @notice Lấy tất cả session đang PENDING của một tài liệu.
     * @dev    View only — không giới hạn gas vì không write state.
     *         Đếm 2 lần để tránh dynamic array resize.
     */
    function getActiveSessions(string calldata cid)
        external view
        returns (uint256[] memory activeIds)
    {
        uint256[] storage all = cidSessions[cid];
        uint256 count = 0;

        for (uint256 i = 0; i < all.length; i++) {
            if (sessions[all[i]].status == SessionStatus.PENDING) count++;
        }

        activeIds = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (sessions[all[i]].status == SessionStatus.PENDING) {
                activeIds[idx++] = all[i];
            }
        }
    }

    /**
     * @notice Kiểm tra signature hợp lệ không — dùng cho NestJS pre-validation.
     * @dev    Gọi trước khi user submit tx để báo lỗi sớm, tiết kiệm gas.
     *
     * @param sessionId  Session cần kiểm tra
     * @param signer     Địa chỉ dự kiến
     * @param signature  65-byte signature bytes
     * @return valid     true nếu signature đúng với signer
     */
    function verifySignature(
        uint256        sessionId,
        address        signer,
        bytes calldata signature
    ) external view returns (bool valid) {
        SigningSession storage session = sessions[sessionId];
        if (session.createdAt == 0) return false;
        if (signature.length != 65) return false;

        address recovered = _recoverSigner(sessionId, session.cid, signature);
        return recovered == signer;
    }
}