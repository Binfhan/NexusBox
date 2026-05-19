// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DocVaultStorage.sol";

/**
 * @title DocVaultSigning
 * @notice Multi-party document signing — nhiều ví cùng ký 1 tài liệu,
 *         tất cả ký xong → trạng thái FINALIZED, bất biến on-chain.
 *
 * USE CASE: Hợp đồng freelance, thoả thuận giữa các bên không tin tưởng
 *           server trung gian.
 *
 * LIÊN KẾT:
 *   - NestJS signing.service.ts tạo session bằng createSigningSession()
 *   - Mỗi signer dùng frontend ký bằng MetaMask → gọi sign()
 *   - Backend lắng nghe event SessionFinalized để cập nhật DB
 */
contract DocVaultSigning {

    // ─── Enums & Structs ──────────────────────────────────────────────────────

    enum SessionStatus { PENDING, FINALIZED, CANCELLED }

    struct SigningSession {
        string        cid;           // tài liệu cần ký
        address       initiator;     // người tạo session (phải là doc owner)
        address[]     requiredSigners;
        uint256       deadline;      // ký trước thời điểm này
        SessionStatus status;
        uint256       createdAt;
        uint256       finalizedAt;
    }

    struct SignerRecord {
        bool    signed;
        uint256 signedAt;
        bytes   signature;  // ECDSA signature từ MetaMask
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    DocVaultStorage public immutable storageContract;

    uint256 private _sessionCounter;

    // sessionId => session
    mapping(uint256 => SigningSession) public sessions;

    // sessionId => signer => record
    mapping(uint256 => mapping(address => SignerRecord)) public signerRecords;

    // sessionId => số chữ ký đã thu thập
    mapping(uint256 => uint256) public signatureCount;

    // cid => sessionIds — 1 tài liệu có thể có nhiều session
    mapping(string => uint256[]) public cidSessions;

    // ─── Events ───────────────────────────────────────────────────────────────

    event SessionCreated(
        uint256 indexed sessionId,
        string  indexed cid,
        address initiator,
        address[] signers,
        uint256 deadline
    );

    event DocumentSigned(
        uint256 indexed sessionId,
        address indexed signer,
        uint256 signedAt
    );

    event SessionFinalized(
        uint256 indexed sessionId,
        string  indexed cid,
        uint256 finalizedAt
    );

    event SessionCancelled(uint256 indexed sessionId);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error DocumentNotFound(string cid);
    error NotDocumentOwner(string cid);
    error SessionNotFound(uint256 sessionId);
    error SessionNotPending(uint256 sessionId);
    error NotRequiredSigner(uint256 sessionId, address caller);
    error AlreadySigned(uint256 sessionId, address signer);
    error DeadlinePassed(uint256 sessionId);
    error DeadlineTooShort();
    error NoSignersProvided();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address storageAddr) {
        storageContract = DocVaultStorage(storageAddr);
    }

    // ─── Write functions ──────────────────────────────────────────────────────

    /**
     * @notice Tạo session ký tài liệu với danh sách các ví bắt buộc ký.
     * @dev NestJS signing.service.ts gọi hàm này khi user tạo signing request.
     *
     * @param cid      CID tài liệu
     * @param signers  danh sách địa chỉ ví phải ký
     * @param deadline unix timestamp — deadline ký (tối thiểu 1 giờ)
     * @return sessionId  ID của session vừa tạo
     */
    function createSigningSession(
        string    calldata cid,
        address[] calldata signers,
        uint256            deadline
    ) external returns (uint256) {
        if (!storageContract.cidExists(cid))              revert DocumentNotFound(cid);
        if (storageContract.getOwner(cid) != msg.sender)  revert NotDocumentOwner(cid);
        if (signers.length == 0)                          revert NoSignersProvided();
        if (deadline < block.timestamp + 1 hours)         revert DeadlineTooShort();

        uint256 sessionId = ++_sessionCounter;

        sessions[sessionId] = SigningSession({
            cid:              cid,
            initiator:        msg.sender,
            requiredSigners:  signers,
            deadline:         deadline,
            status:           SessionStatus.PENDING,
            createdAt:        block.timestamp,
            finalizedAt:      0
        });

        cidSessions[cid].push(sessionId);

        emit SessionCreated(sessionId, cid, msg.sender, signers, deadline);
        return sessionId;
    }

    /**
     * @notice Signer ký tài liệu.
     * @dev Frontend gọi sau khi user nhấn "Sign with MetaMask".
     *      signature là kết quả của ethers.signMessage() ở frontend.
     *      Khi tất cả signers đã ký → session tự động FINALIZED.
     *
     * @param sessionId  ID session
     * @param signature  ECDSA signature bytes từ wallet
     */
    function sign(uint256 sessionId, bytes calldata signature) external {
        SigningSession storage session = sessions[sessionId];
        if (session.createdAt == 0)                revert SessionNotFound(sessionId);
        if (session.status != SessionStatus.PENDING) revert SessionNotPending(sessionId);
        if (block.timestamp > session.deadline)    revert DeadlinePassed(sessionId);

        // check caller có trong danh sách signers không
        bool isRequired = false;
        for (uint256 i = 0; i < session.requiredSigners.length; i++) {
            if (session.requiredSigners[i] == msg.sender) {
                isRequired = true;
                break;
            }
        }
        if (!isRequired) revert NotRequiredSigner(sessionId, msg.sender);
        if (signerRecords[sessionId][msg.sender].signed) revert AlreadySigned(sessionId, msg.sender);

        // lưu chữ ký
        signerRecords[sessionId][msg.sender] = SignerRecord({
            signed:    true,
            signedAt:  block.timestamp,
            signature: signature
        });

        signatureCount[sessionId]++;

        emit DocumentSigned(sessionId, msg.sender, block.timestamp);

        // auto-finalize khi đủ chữ ký
        if (signatureCount[sessionId] == session.requiredSigners.length) {
            session.status      = SessionStatus.FINALIZED;
            session.finalizedAt = block.timestamp;
            emit SessionFinalized(sessionId, session.cid, block.timestamp);
        }
    }

    /**
     * @notice Initiator huỷ session trước deadline (nếu cần).
     */
    function cancelSession(uint256 sessionId) external {
        SigningSession storage session = sessions[sessionId];
        if (session.createdAt == 0)                    revert SessionNotFound(sessionId);
        if (session.status != SessionStatus.PENDING)   revert SessionNotPending(sessionId);
        if (session.initiator != msg.sender)           revert NotDocumentOwner(session.cid);

        session.status = SessionStatus.CANCELLED;
        emit SessionCancelled(sessionId);
    }

    // ─── Read functions ───────────────────────────────────────────────────────

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

    /// @notice Lấy trạng thái ký của tất cả signers trong 1 session
    function getSigningStatus(uint256 sessionId)
        external
        view
        returns (address[] memory signers, bool[] memory signed)
    {
        SigningSession memory session = sessions[sessionId];
        signers = session.requiredSigners;
        signed  = new bool[](signers.length);
        for (uint256 i = 0; i < signers.length; i++) {
            signed[i] = signerRecords[sessionId][signers[i]].signed;
        }
    }
}