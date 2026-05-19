// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DocVaultStorage.sol";

/**
 * @title DocNFT
 * @notice Soul-bound NFT (SBT) — không thể transfer, chứng minh
 *         quyền sở hữu tài liệu tại thời điểm cụ thể.
 *         Giống như bằng tốt nghiệp, chứng chỉ — không bán được.
 *
 * LIÊN KẾT:
 *   - Mint sau khi DocVaultStorage.storeDocument() thành công
 *   - NestJS blockchain.service.ts gọi mintOwnershipNFT()
 *   - Frontend hiển thị NFT badge trên document card
 *   - tokenURI trả về metadata JSON dùng CID từ DocVaultStorage
 */
contract DocNFT {

    // ─── Storage ──────────────────────────────────────────────────────────────

    DocVaultStorage public immutable storageContract;

    uint256 private _tokenCounter;

    // tokenId => CID — mỗi token đại diện cho 1 tài liệu
    mapping(uint256 => string)  public tokenCID;

    // tokenId => owner
    mapping(uint256 => address) public ownerOf;

    // owner => list of tokenIds
    mapping(address => uint256[]) public tokensOf;

    // CID => tokenId — mỗi CID chỉ có 1 NFT (prevent double-mint)
    mapping(string => uint256) public cidToToken;

    // tokenId => timestamp mint
    mapping(uint256 => uint256) public mintedAt;

    string public name   = "DocVault Ownership";
    string public symbol = "DVOWN";

    // ─── Events ───────────────────────────────────────────────────────────────

    event Minted(uint256 indexed tokenId, address indexed owner, string cid, uint256 timestamp);

    // soul-bound: Transfer luôn emit với from=0 (mint) hoặc to=0 (burn)
    // không bao giờ emit Transfer với cả from và to khác 0
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error Soulbound();                    // không thể transfer
    error NotDocumentOwner(string cid);
    error DocumentNotFound(string cid);
    error AlreadyMinted(string cid);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address storageAddr) {
        storageContract = DocVaultStorage(storageAddr);
    }

    // ─── Write functions ──────────────────────────────────────────────────────

    /**
     * @notice Mint NFT chứng minh sở hữu tài liệu.
     * @dev Chỉ owner của CID trong DocVaultStorage mới mint được.
     *      Mỗi CID chỉ mint 1 lần duy nhất.
     *      NestJS gọi sau storeDocument() thành công.
     *
     * @param cid  CID đã được lưu trong DocVaultStorage
     * @return tokenId  ID của NFT vừa mint
     */
    function mintOwnershipNFT(string calldata cid) external returns (uint256) {
        if (!storageContract.cidExists(cid))              revert DocumentNotFound(cid);
        if (storageContract.getOwner(cid) != msg.sender)  revert NotDocumentOwner(cid);
        if (cidToToken[cid] != 0)                         revert AlreadyMinted(cid);

        uint256 tokenId = ++_tokenCounter;

        tokenCID[tokenId]   = cid;
        ownerOf[tokenId]    = msg.sender;
        mintedAt[tokenId]   = block.timestamp;
        cidToToken[cid]     = tokenId;
        tokensOf[msg.sender].push(tokenId);

        emit Transfer(address(0), msg.sender, tokenId);
        emit Minted(tokenId, msg.sender, cid, block.timestamp);

        return tokenId;
    }

    // ─── Soul-bound: block tất cả transfer ───────────────────────────────────

    /// @dev Revert mọi attempt transfer — đây là soul-bound token
    function transferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function approve(address, uint256) external pure {
        revert Soulbound();
    }

    // ─── Read / metadata ──────────────────────────────────────────────────────

    function balanceOf(address owner) external view returns (uint256) {
        return tokensOf[owner].length;
    }

    /**
     * @notice Trả về metadata JSON dạng on-chain (không cần server).
     * @dev Frontend dùng tokenURI để hiển thị NFT card.
     *      Data URL chứa JSON với IPFS gateway link đến file gốc.
     */
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(ownerOf[tokenId] != address(0), "Token does not exist");
        string memory cid = tokenCID[tokenId];

        // trả về base64 JSON on-chain — không cần IPFS metadata
        return string(abi.encodePacked(
            'data:application/json;utf8,{"name":"DocVault #',
            _toString(tokenId),
            '","description":"Proof of document ownership","cid":"',
            cid,
            '","image":"https://ipfs.io/ipfs/',
            cid,
            '"}'
        ));
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}