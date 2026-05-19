pragma solidity ^0.8.28;

import "./DocVaultStorage.sol";
import "./DocVaultAccess.sol";

contract DocVaultPayment {
  DocVaultStorage public immutable storageContract;
  DocVaultAccess public immutable accessContract;

  //Phí platform: 250 = 2.5%
  uint public platformFeeBps = 250;
  address public platformWallet;
  address public owner;

  mapping(string => uint256) public docPrice;

  mapping(string => uint256) public totalRevenue;

  event PriceSet(string indexed cid, uint256 priceWei);
  event AccessPurchased(
    string indexed cid,
    address indexed buyer,
    address indexed docOwner,
    uint256 amount,
    uint256 platformFee
  );

  //error 
  error NotDocumentOwner(string cid);
  error DocumentNotFound(string cid);
  error DocumentNotForSale(string cid);
  error InsufficientPayment(uint256 required, uint256 sent);
  error AlreadyHasAccess(string cid, address buyer);
  error OnlyOwner();

  constructor(address storageAddr, address accessAddr, address _platformWallet) {
    storageContract = DocVaultStorage(storageAddr);
  accessContract = DocVaultAccess(accessAddr);
  platformWallet = _platformWallet;
  owner = msg.sender;
  }

  modifier onlyOwner(){
    if (msg.sender != owner) revert OnlyOwner();
    _;
  }

  function setPrice(string calldata cid, uint256 priceWei) external {
    if (!storageContract.cidExists(cid)) revert DocumentNotFound(cid);
    if(storageContract.getOwner(cid) != msg.sender) revert NotDocumentOwner(cid);

    docPrice[cid] = priceWei;
    emit PriceSet(cid, priceWei);
  }

  function purchaseAccess(string calldata cid) external payable {
    if (!storageContract.cidExists(cid)) revert DocumentNotFound(cid);
    uint256 price = docPrice[cid];
    if (price == 0) revert DocumentNotForSale(cid);
    if (msg.value < price) revert InsufficientPayment(price, msg.value);

    //check khong mua 2 lan
    if (accessContract.hasValidAccess(cid, msg.sender)){
      revert AlreadyHasAccess(cid, msg.sender);
    }

    address docOwner = storageContract.getOwner(cid);

    //tinh phi flatform
    uint256 fee = (msg.value * platformFeeBps) / 10000;
    uint256 onwerAmount = msg.value - fee;

    //chuyen tiep

    payable(docOwner).transfer(onwerAmount);
    if (fee > 0) payable(platformWallet).transfer(fee);

    //cap quyen truy cap vinh vien

    accessContract.grantAccessFromPayment(cid, msg.sender, docOwner);
    
    totalRevenue[cid] += msg.value;

    emit AccessPurchased(cid, msg.sender, docOwner, onwerAmount, fee);

  }

  function setPlatformFee(uint256 newFeeBps) external onlyOwner {
    require(newFeeBps <= 1000, "Max 10%");
    platformFeeBps = newFeeBps;
  }

  function setPlatformWallet(address newWallet) external onlyOwner{
    platformWallet = newWallet;
  }

}