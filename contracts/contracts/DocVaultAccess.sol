// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DocVaultStorage.sol";

/**
 * @title DocVaultAccess
 * @notice Quản lý quyền truy cập tài liệu giữa các địa chỉ ví.
 *
 * LUỒNG SỬ DỤNG:
 *   A. Doc owner cấp thủ công:
 *      owner → grantAccess(cid, grantee, expiresAt, canDownload)
 *
 *   B. Tự động sau khi mua:
 *      DocVaultPayment → grantAccessFromPayment(cid, buyer, docOwner)
 *      [CHỈ Payment contract được gọi hàm này]
 *
 *   C. Kiểm tra trước khi cho xem/download:
 *      NestJS → hasValidAccess(cid, user) / canDownload(cid, user)
 */
contract DocVaultAccess {

    // =========================================================================
    // SECTION 1: OWNABLE + PAUSABLE
    // =========================================================================

    address public owner;
    bool    public paused;

    event OwnershipTransferred(address indexed previous, address indexed newOwner);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event PaymentContractSet(address indexed paymentContract);

    error OnlyOwner();
    error ContractPaused();
    error OnlyPaymentContract(); // critical security guard

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
    // SECTION 2: STRUCT
    // =========================================================================

    struct AccessGrant {
        address grantee;      // địa chỉ được cấp quyền
        uint256 expiresAt;    // unix timestamp hết hạn; 0 = vĩnh viễn
        bool    canDownload;  // có thể download file gốc không
        bool    active;       // false = đã bị revoke
        address grantedBy;    // doc owner hoặc Payment contract
        uint256 grantedAt;    // timestamp cấp quyền
    }


    // =========================================================================
    // SECTION 3: STORAGE
    // =========================================================================

    DocVaultStorage public immutable storageContract;

    /**
     * @notice Địa chỉ DocVaultPayment — CHỈ contract này được gọi grantAccessFromPayment.
     *
     * BUG CŨ: hàm grantAccessFromPayment không có access control →
     *         bất kỳ ai cũng có thể tự cấp quyền cho mình mà không cần trả tiền.
     *
     * FIX: kiểm tra msg.sender == paymentContract trong hàm đó.
     *      Admin phải gọi setPaymentContract() sau khi deploy Payment.
     */
    address public paymentContract;

    // cid → grantee → AccessGrant
    mapping(string => mapping(address => AccessGrant)) private _grants;

    // cid → danh sách grantee (để iterate khi revokeAll)
    mapping(string => address[]) private _grantees;

    /**
     * @notice Fix duplicate grantee.
     *
     * BUG CŨ: _grantees[cid].push(grantee) được gọi mỗi lần grant/re-grant
     *         → cùng 1 địa chỉ xuất hiện nhiều lần trong mảng
     *         → revokeAllAccess() loop dư thừa, getGrantees() trả về rác.
     *
     * FIX: mapping O(1) — chỉ push vào _grantees nếu chưa có.
     */
    mapping(string => mapping(address => bool)) private _isGrantee;


    // =========================================================================
    // SECTION 4: EVENTS
    // =========================================================================

    event AccessGranted(string indexed cid, address indexed grantee, uint256 expiresAt, bool canDownload);
    event AccessExtended(string indexed cid, address indexed grantee, uint256 newExpiresAt);
    event AccessUpdated(string indexed cid, address indexed grantee, bool canDownload);
    event AccessRevoked(string indexed cid, address indexed grantee);
    event AllAccessRevoked(string indexed cid, uint256 count);


    // =========================================================================
    // SECTION 5: ERRORS
    // =========================================================================

    error DocumentNotFound(string cid);
    error NotDocumentOwner(string cid);
    error AccessNotFound(string cid, address grantee);
    error CannotGrantToSelf();
    error PaymentContractNotSet();


    // =========================================================================
    // SECTION 6: CONSTRUCTOR
    // =========================================================================

    constructor(address storageAddress) {
        storageContract = DocVaultStorage(storageAddress);
        owner = msg.sender;
    }


    // =========================================================================
    // SECTION 7: ADMIN
    // =========================================================================

    /**
     * @notice Thiết lập địa chỉ DocVaultPayment.
     * @dev    Gọi ngay sau khi deploy DocVaultPayment.
     *         Có thể gọi lại nếu re-deploy Payment (upgrade).
     */
    function setPaymentContract(address paymentAddr) external onlyOwner {
        require(paymentAddr != address(0), "Zero address");
        paymentContract = paymentAddr;
        emit PaymentContractSet(paymentAddr);
    }


    // =========================================================================
    // SECTION 8: MODIFIERS
    // =========================================================================

    modifier onlyDocOwner(string calldata cid) {
        if (!storageContract.cidExists(cid))             revert DocumentNotFound(cid);
        if (storageContract.getOwner(cid) != msg.sender) revert NotDocumentOwner(cid);
        _;
    }


    // =========================================================================
    // SECTION 9: INTERNAL HELPER
    // =========================================================================

    /**
     * @dev Thêm grantee vào _grantees[] chỉ khi chưa có.
     *      Gọi trước mỗi lần _grants[cid][grantee] = ...
     */
    function _addGranteeIfNew(string calldata cid, address grantee) internal {
        if (!_isGrantee[cid][grantee]) {
            _grantees[cid].push(grantee);
            _isGrantee[cid][grantee] = true;
        }
    }


    // =========================================================================
    // SECTION 10: WRITE FUNCTIONS
    // =========================================================================

    /**
     * @notice Doc owner cấp quyền thủ công cho một địa chỉ.
     *
     * @param expiresAt  0 = vĩnh viễn; unix timestamp = có hạn
     * @param canDownload true = được download file gốc
     */
    function grantAccess(
        string  calldata cid,
        address grantee,
        uint256 expiresAt,
        bool    canDownload
    ) external whenNotPaused onlyDocOwner(cid) {
        if (grantee == msg.sender) revert CannotGrantToSelf();

        _addGranteeIfNew(cid, grantee);

        _grants[cid][grantee] = AccessGrant({
            grantee:     grantee,
            expiresAt:   expiresAt,
            canDownload: canDownload,
            active:      true,
            grantedBy:   msg.sender,
            grantedAt:   block.timestamp
        });

        emit AccessGranted(cid, grantee, expiresAt, canDownload);
    }

    /**
     * @notice Gia hạn thời gian truy cập — không cần revoke rồi grant lại.
     */
    function extendAccess(
        string  calldata cid,
        address grantee,
        uint256 newExpiresAt
    ) external whenNotPaused onlyDocOwner(cid) {
        AccessGrant storage grant = _grants[cid][grantee];
        if (!grant.active) revert AccessNotFound(cid, grantee);

        grant.expiresAt = newExpiresAt;
        emit AccessExtended(cid, grantee, newExpiresAt);
    }

    /**
     * @notice Cập nhật quyền download mà không cần tạo grant mới.
     */
    function updateAccess(
        string  calldata cid,
        address grantee,
        bool    canDownload
    ) external whenNotPaused onlyDocOwner(cid) {
        AccessGrant storage grant = _grants[cid][grantee];
        if (!grant.active) revert AccessNotFound(cid, grantee);

        grant.canDownload = canDownload;
        emit AccessUpdated(cid, grantee, canDownload);
    }

    /**
     * @notice Thu hồi quyền của một grantee cụ thể.
     */
    function revokeAccess(string calldata cid, address grantee)
        external whenNotPaused onlyDocOwner(cid)
    {
        if (!_grants[cid][grantee].active) revert AccessNotFound(cid, grantee);
        _grants[cid][grantee].active = false;
        emit AccessRevoked(cid, grantee);
    }

    /**
     * @notice Thu hồi tất cả quyền truy cập của một tài liệu.
     * @dev    Gas: O(n) với n = số grantees.
     *         Dùng trong tình huống khẩn cấp (tài liệu bị leak, dispute hợp đồng...).
     *         Không xóa _grantees[] để tiết kiệm gas — chỉ set active = false.
     */
    function revokeAllAccess(string calldata cid)
        external whenNotPaused onlyDocOwner(cid)
    {
        address[] storage grantees = _grantees[cid];
        uint256 count = grantees.length;

        for (uint256 i = 0; i < count; i++) {
            _grants[cid][grantees[i]].active = false;
        }

        emit AllAccessRevoked(cid, count);
    }

    /**
     * @notice Cấp quyền sau khi buyer thanh toán thành công.
     *
     * SECURITY:
     *   - Chỉ docPaymentContract được gọi (msg.sender == paymentContract)
     *   - Nếu paymentContract chưa được set → revert PaymentContractNotSet
     *   - Không cần onlyDocOwner vì Payment đã verify ownership trước đó
     *
     * @param docOwner  Truyền từ Payment để ghi vào grantedBy (audit trail)
     */
    function grantAccessFromPayment(
        string  calldata cid,
        address grantee,
        address docOwner
    ) external whenNotPaused {
        if (paymentContract == address(0)) revert PaymentContractNotSet();
        if (msg.sender != paymentContract)  revert OnlyPaymentContract();

        _addGranteeIfNew(cid, grantee);

        _grants[cid][grantee] = AccessGrant({
            grantee:     grantee,
            expiresAt:   0,    // mua = vĩnh viễn
            canDownload: true, // mua = có quyền download
            active:      true,
            grantedBy:   docOwner,
            grantedAt:   block.timestamp
        });

        emit AccessGranted(cid, grantee, 0, true);
    }


    // =========================================================================
    // SECTION 11: READ FUNCTIONS
    // =========================================================================

    /**
     * @notice Kiểm tra user có quyền xem tài liệu không.
     *         NestJS middleware gọi trước khi trả về metadata.
     */
    function hasValidAccess(string calldata cid, address user)
        external view returns (bool)
    {
        // Doc owner luôn có full quyền
        if (storageContract.cidExists(cid) && storageContract.getOwner(cid) == user)
            return true;

        AccessGrant memory grant = _grants[cid][user];
        if (!grant.active) return false;
        if (grant.expiresAt != 0 && block.timestamp > grant.expiresAt) return false;
        return true;
    }

    /**
     * @notice Kiểm tra user có quyền download file gốc không.
     *         NestJS gọi trước khi generate presigned URL từ S3/IPFS.
     */
    function canDownload(string calldata cid, address user)
        external view returns (bool)
    {
        if (storageContract.cidExists(cid) && storageContract.getOwner(cid) == user)
            return true;

        AccessGrant memory grant = _grants[cid][user];
        if (!grant.active) return false;
        if (grant.expiresAt != 0 && block.timestamp > grant.expiresAt) return false;
        return grant.canDownload;
    }

    function getGrant(string calldata cid, address grantee)
        external view returns (AccessGrant memory)
    {
        return _grants[cid][grantee];
    }

    function getGrantees(string calldata cid)
        external view returns (address[] memory)
    {
        return _grantees[cid];
    }
}