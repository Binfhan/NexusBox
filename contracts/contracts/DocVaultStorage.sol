pragma solidity ^0.8.28;

contract DocVaultStorage {
  struct Document {
    string cid;
    string offchainId;
    address owner;
    uint256 storedAt;
    bool aiVerified;
    bool isPublic;
    uint8 docType;
  }

  //cid -> Document - tra cuu nhanh bang CID
  mapping(string => Document) private _documents;

  //owner => list of CIDs - lay tat ca docs cua 1 vi
  mapping(address => string[]) private _ownerDocs;

  //cid => exists - check nhanh 0(1) thay vi loop
  mapping (string=>bool) private _cidExists;

  //Tong so tai lieu - dung cho statistics
  uint256 public totalDocuments;

  //Event-----------------------------------------------------------
  //backend lang nghe event de update txHash vao postgreSQL
  event DocumentStored(
    address indexed owner,
    string indexed cid,
    string offchainId,
    uint256 storedAt,
    bool aiVerified
  )

  event DocumentVisibilityChanged(string indexed cid, bool isPublic);

  //Errors
  error CIDAlreadyExists(string cid);
  error DocumentNotFound(string cid);
  error NotDocumentOwner(string cid, address caller);
  error EmptyCID();
  error EmptyOffchainId();
  //Modifiers
  modifier onlyDocOwner(string calldata cid){
    if(_documents[cid].owner != msg.sender){
      revert NotDocumentOwner(cid, msg.sender);
    }
    _;
  }
  modifier docExists(string calldata cid){
    if(!_cidExists[cid]) revert DocumentNotFound(cid);
    _;
  }

  
}