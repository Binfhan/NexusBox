// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DocVaultStorage.sol";
import "./DocVaultAccess.sol";

/**
 * @title DocVaultPayment
 * @notice Xử lý thanh toán ETH để mua quyền truy cập vĩnh viễn vào tài liệu.
 *
 * LUỒNG:
 *   1. Doc owner gọi setPrice(cid, priceWei) để niêm yết giá
 *   2. Buyer gọi purchaseAccess{value: price}(cid)
 *   3. Contract chia tiền: ownerAmount → docOwner; fee → tích vào platformRevenue
 *   4. Contract gọi accessContract.grantAccessFromPayment() cấp quyền cho buyer
 *   5. Buyer được quyền truy cập vĩnh viễn
 *   6. Platform owner gọi withdrawPlatformRevenue() để rút phí tích lũy
 *
 * SECURITY PATTERNS:
 *   - CEI (Checks → Effects → Interactions)
 *   - nonReentrant guard
 *   - Pull payment cho platform fee (tránh push DoS)
 *   - Refund tiền thừa nếu msg.value > price
 */
contract DocVaultPayment {

    // =========================================================================
    // SECTION 1: REENTRANCY GUARD (tự implement)
    // =========================================================================
    //
    // Tại sao cần nonReentrant?
    //   purchaseAccess() chuyển ETH ra ngoài (external call).
    //   Nếu docOwner là contract độc hại với fallback() gọi lại purchaseAccess()
    //   → có thể drain contract hoặc grant access nhiều lần.
    //
    // Cách hoạt động:
    //   - Trước khi execute: set status = ENTERED
    //   - Nếu ai gọi lại trong lúc đang execute: revert vì status == ENTERED
    //   - Sau khi execute xong: reset về NOT_ENTERED

    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;

    error ReentrantCall();

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrantCall();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }


    // =========================================================================
    // SECTION 2: OWNABLE + PAUSABLE
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
    // SECTION 3: STORAGE
    // =========================================================================

    DocVaultStorage public immutable storageContract;
    DocVaultAccess  public immutable accessContract;

    uint256 public platformFeeBps = 250; // 250 / 10000 = 2.5%
    address public platformWallet;

    /**
     * @notice Phí tích lũy chưa rút — pull pattern.
     *
     * Tại sao không tự động push phí ra platformWallet mỗi lần mua?
     *   Nếu platformWallet là contract có fallback() throw → mỗi lần mua đều revert
     *   → toàn bộ hệ thống bán tài liệu bị DoS.
     *
     * Pull pattern: phí tích vào đây, admin chủ động gọi withdrawPlatformRevenue().
     */
    uint256 public platformRevenue;

    mapping(string => uint256) public docPrice;      // cid → giá (wei)
    mapping(string => uint256) public totalRevenue;  // cid → tổng đã thu (phần owner)


    // =========================================================================
    // SECTION 4: EVENTS
    // =========================================================================

    event PriceSet(string indexed cid, uint256 priceWei);
    event AccessPurchased(
        string  indexed cid,
        address indexed buyer,
        address indexed docOwner,
        uint256         ownerAmount,
        uint256         platformFee
    );
    event ExcessRefunded(address indexed buyer, uint256 amount);
    event PlatformRevenueWithdrawn(address indexed to, uint256 amount);
    event PlatformFeeUpdated(uint256 newFeeBps);
    event PlatformWalletUpdated(address indexed newWallet);


    // =========================================================================
    // SECTION 5: ERRORS
    // =========================================================================

    error NotDocumentOwner(string cid);
    error DocumentNotFound(string cid);
    error DocumentNotForSale(string cid);
    error InsufficientPayment(uint256 required, uint256 sent);
    error AlreadyHasAccess(string cid, address buyer);
    error NothingToWithdraw();
    error TransferFailed();


    // =========================================================================
    // SECTION 6: CONSTRUCTOR
    // =========================================================================

    constructor(
        address storageAddr,
        address accessAddr,
        address _platformWallet
    ) {
        require(_platformWallet != address(0), "Zero wallet");
        storageContract   = DocVaultStorage(storageAddr);
        accessContract    = DocVaultAccess(accessAddr);
        platformWallet    = _platformWallet;
        owner             = msg.sender;
        _reentrancyStatus = _NOT_ENTERED; // khởi tạo guard
    }


    // =========================================================================
    // SECTION 7: WRITE FUNCTIONS
    // =========================================================================

    /**
     * @notice Doc owner niêm yết giá tài liệu.
     * @dev    setPrice(cid, 0) = rút khỏi bán (DocumentNotForSale).
     */
    function setPrice(string calldata cid, uint256 priceWei) external whenNotPaused {
        if (!storageContract.cidExists(cid))             revert DocumentNotFound(cid);
        if (storageContract.getOwner(cid) != msg.sender) revert NotDocumentOwner(cid);

        docPrice[cid] = priceWei;
        emit PriceSet(cid, priceWei);
    }

    /**
     * @notice Buyer thanh toán để nhận quyền truy cập vĩnh viễn.
     *
     * ─── CEI PATTERN ────────────────────────────────────────────────
     *
     * CHECKS (validate trước, không thay đổi state):
     *   1. Tài liệu tồn tại
     *   2. Tài liệu đang bán (price > 0)
     *   3. Buyer gửi đủ tiền
     *   4. Buyer chưa có quyền truy cập
     *
     * EFFECTS (thay đổi state trước khi gọi external):
     *   5. Tính fee và ownerAmount dựa trên `price` (KHÔNG phải msg.value)
     *      → Lý do: msg.value có thể lớn hơn price (buyer gửi thừa)
     *               nếu dùng msg.value để tính → platform lấy thêm tiền không hợp lệ
     *   6. Cộng vào totalRevenue và platformRevenue
     *   7. Gọi grantAccessFromPayment (state change trong contract khác)
     *
     * INTERACTIONS (chuyển ETH ra ngoài — CUỐI CÙNG):
     *   8. Chuyển ownerAmount cho docOwner
     *   9. Refund excess cho buyer nếu msg.value > price
     *
     * ────────────────────────────────────────────────────────────────
     *
     * @dev payable + nonReentrant
     */
    function purchaseAccess(string calldata cid)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        // ── CHECKS ────────────────────────────────────────────────────────────
        if (!storageContract.cidExists(cid))
            revert DocumentNotFound(cid);

        uint256 price = docPrice[cid];
        if (price == 0)
            revert DocumentNotForSale(cid);
        if (msg.value < price)
            revert InsufficientPayment(price, msg.value);
        if (accessContract.hasValidAccess(cid, msg.sender))
            revert AlreadyHasAccess(cid, msg.sender);

        address docOwner = storageContract.getOwner(cid);

        // ── EFFECTS ───────────────────────────────────────────────────────────
        uint256 fee         = (price * platformFeeBps) / 10_000; // dùng price, không phải msg.value
        uint256 ownerAmount = price - fee;
        uint256 excess      = msg.value - price; // 0 nếu buyer gửi đúng

        totalRevenue[cid] += ownerAmount;
        platformRevenue   += fee;

        // Cấp quyền trước khi chuyển ETH (state change, không phải ETH transfer)
        accessContract.grantAccessFromPayment(cid, msg.sender, docOwner);

        // ── INTERACTIONS ──────────────────────────────────────────────────────
        (bool sentOwner, ) = payable(docOwner).call{value: ownerAmount}("");
        if (!sentOwner) revert TransferFailed();

        // Hoàn tiền thừa cho buyer
        if (excess > 0) {
            (bool sentRefund, ) = payable(msg.sender).call{value: excess}("");
            if (!sentRefund) revert TransferFailed();
            emit ExcessRefunded(msg.sender, excess);
        }

        emit AccessPurchased(cid, msg.sender, docOwner, ownerAmount, fee);
    }

    /**
     * @notice Admin rút toàn bộ phí platform tích lũy.
     * @dev    Pull pattern — admin chủ động gọi, không tự push.
     *         nonReentrant để tránh reentrancy khi transfer ETH.
     */
    function withdrawPlatformRevenue() external onlyOwner nonReentrant {
        uint256 amount = platformRevenue;
        if (amount == 0) revert NothingToWithdraw();

        // Effects trước Interactions
        platformRevenue = 0;

        (bool sent, ) = payable(platformWallet).call{value: amount}("");
        if (!sent) revert TransferFailed();

        emit PlatformRevenueWithdrawn(platformWallet, amount);
    }


    // =========================================================================
    // SECTION 8: ADMIN
    // =========================================================================

    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1_000, "Max 10%"); // hard cap chống admin abuse
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function setPlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Zero address");
        platformWallet = newWallet;
        emit PlatformWalletUpdated(newWallet);
    }


    // =========================================================================
    // SECTION 9: READ FUNCTIONS
    // =========================================================================

    function getPrice(string calldata cid) external view returns (uint256) {
        return docPrice[cid];
    }
}