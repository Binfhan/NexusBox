// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title DocVaultStorage
 * @notice Lưu trữ metadata tài liệu on-chain.
 *         Single source of truth: CID → Document → owner.
 *
 * ROLE trong hệ thống:
 *   - Được gọi bởi DocVaultAccess, DocVaultPayment, DocVaultSigning
 *     để kiểm tra cidExists() và getOwner()
 *   - User trực tiếp gọi storeDocument(), removeDocument(), updateMetadata()
 */
contract DocVaultStorage {

    // =========================================================================
    // SECTION 1: OWNABLE + PAUSABLE (tự implement, không dùng OpenZeppelin)
    // =========================================================================
    //
    // Tại sao tự implement?
    //   - Tránh phụ thuộc external package khi audit
    //   - Code đơn giản, dễ đọc, dễ verify từng dòng
    //
    // Ownable: chỉ 1 địa chỉ (owner) có quyền admin
    // Pausable: owner có thể tạm dừng tất cả write functions khi phát hiện exploit

    address public owner;   // admin của contract
    bool    public paused;  // true = tất cả write functions bị khóa

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    error OnlyOwner();       // caller không phải owner
    error ContractPaused();  // contract đang bị pause

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // Gắn vào mọi write function — revert ngay nếu đang pause
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
    // SECTION 2: STRUCT
    // =========================================================================

    struct Document {
        string  cid;          // IPFS/Filecoin Content ID — immutable sau khi store
        string  offchainId;   // UUID trong PostgreSQL để join với dữ liệu off-chain
        address owner;        // ví sở hữu tài liệu
        uint256 storedAt;     // block.timestamp lúc upload
        bool    aiVerified;   // AI đã xác minh nội dung chưa
        bool    isPublic;     // ai cũng xem được metadata hay không
        uint8   docType;      // enum off-chain: 0=contract, 1=invoice, 2=certificate...
        bool    isDeleted;    // soft-delete flag — CID không bị tái sử dụng
        uint256 updatedAt;    // timestamp cập nhật metadata lần cuối
    }


    // =========================================================================
    // SECTION 3: STORAGE
    // =========================================================================

    mapping(string => Document) private _documents;   // cid → Document
    mapping(address => string[]) private _ownerDocs;  // owner → danh sách CID (kể cả đã xóa)
    mapping(string => bool) private _cidExists;        // O(1) check — false nếu chưa có hoặc đã xóa

    uint256 public totalDocuments; // thống kê, giảm khi soft-delete


    // =========================================================================
    // SECTION 4: EVENTS
    // =========================================================================

    event DocumentStored(
        address indexed owner,
        string  indexed cid,
        string          offchainId,
        uint256         storedAt,
        bool            aiVerified
    );
    event DocumentVisibilityChanged(string indexed cid, bool isPublic);
    event MetadataUpdated(string indexed cid, bool aiVerified, bool isPublic, uint8 docType, uint256 updatedAt);
    event DocumentRemoved(string indexed cid, address indexed owner, uint256 removedAt);


    // =========================================================================
    // SECTION 5: ERRORS
    // =========================================================================

    error CIDAlreadyExists(string cid);
    error DocumentNotFound(string cid);
    error NotDocumentOwner(string cid, address caller);
    error EmptyCID();
    error EmptyOffchainId();


    // =========================================================================
    // SECTION 6: CONSTRUCTOR
    // =========================================================================

    constructor() {
        owner = msg.sender;
    }


    // =========================================================================
    // SECTION 7: MODIFIERS
    // =========================================================================

    modifier onlyDocOwner(string calldata cid) {
        if (_documents[cid].owner != msg.sender)
            revert NotDocumentOwner(cid, msg.sender);
        _;
    }

    modifier docExists(string calldata cid) {
        if (!_cidExists[cid]) revert DocumentNotFound(cid);
        _;
    }


    // =========================================================================
    // SECTION 8: WRITE FUNCTIONS
    // =========================================================================

    /**
     * @notice Lưu tài liệu lên chain lần đầu.
     * @dev    CID là immutable key — không thể ghi đè.
     *         NestJS backend gọi sau khi upload lên IPFS thành công.
     */
    function storeDocument(
        string calldata cid,
        string calldata offchainId,
        bool    aiVerified,
        bool    isPublic,
        uint8   docType
    ) external whenNotPaused {
        if (bytes(cid).length == 0)        revert EmptyCID();
        if (bytes(offchainId).length == 0) revert EmptyOffchainId();
        if (_cidExists[cid])               revert CIDAlreadyExists(cid);

        _documents[cid] = Document({
            cid:       cid,
            offchainId: offchainId,
            owner:     msg.sender,
            storedAt:  block.timestamp,
            aiVerified: aiVerified,
            isPublic:  isPublic,
            docType:   docType,
            isDeleted: false,
            updatedAt: block.timestamp
        });

        _ownerDocs[msg.sender].push(cid);
        _cidExists[cid] = true;
        totalDocuments++;

        emit DocumentStored(msg.sender, cid, offchainId, block.timestamp, aiVerified);
    }

    /**
     * @notice Cập nhật metadata có thể thay đổi.
     * @dev    CID và owner là immutable — không cập nhật được.
     */
    function updateMetadata(
        string calldata cid,
        bool    aiVerified,
        bool    isPublic,
        uint8   docType
    ) external whenNotPaused docExists(cid) onlyDocOwner(cid) {
        Document storage doc = _documents[cid];
        doc.aiVerified = aiVerified;
        doc.isPublic   = isPublic;
        doc.docType    = docType;
        doc.updatedAt  = block.timestamp;

        emit MetadataUpdated(cid, aiVerified, isPublic, docType, block.timestamp);
    }

    /**
     * @notice Shortcut để toggle visibility (dùng nhiều nhất).
     */
    function setPublic(string calldata cid, bool isPublic)
        external
        whenNotPaused
        docExists(cid)
        onlyDocOwner(cid)
    {
        _documents[cid].isPublic  = isPublic;
        _documents[cid].updatedAt = block.timestamp;
        emit DocumentVisibilityChanged(cid, isPublic);
    }

    /**
     * @notice Soft-delete tài liệu.
     *
     * Tại sao soft-delete thay vì xóa hoàn toàn?
     *   1. CID không bao giờ bị tái sử dụng (tránh collision)
     *   2. Lịch sử signing sessions / access grants vẫn còn on-chain
     *   3. Các contract khác đang giữ reference đến CID không bị broken
     *
     * Sau khi xóa:
     *   - _cidExists[cid] = false → Access, Payment, Signing reject mọi thao tác
     *   - isDeleted = true → raw data vẫn đọc được qua getDocument nếu biết CID
     *   - totalDocuments giảm 1
     */
    function removeDocument(string calldata cid)
        external
        whenNotPaused
        docExists(cid)
        onlyDocOwner(cid)
    {
        _documents[cid].isDeleted = true;
        _cidExists[cid] = false;
        totalDocuments--;

        emit DocumentRemoved(cid, msg.sender, block.timestamp);
    }


    // =========================================================================
    // SECTION 9: READ FUNCTIONS
    // =========================================================================

    function getDocument(string calldata cid)
        external view docExists(cid)
        returns (Document memory)
    {
        return _documents[cid];
    }

    function getOwnerCIDs(address _owner) external view returns (string[] memory) {
        return _ownerDocs[_owner];
    }

    // Được gọi bởi Access, Payment, Signing để validate
    function cidExists(string calldata cid) external view returns (bool) {
        return _cidExists[cid];
    }

    // Được gọi bởi Payment để chuyển tiền đúng địa chỉ
    function getOwner(string calldata cid)
        external view docExists(cid)
        returns (address)
    {
        return _documents[cid].owner;
    }
}