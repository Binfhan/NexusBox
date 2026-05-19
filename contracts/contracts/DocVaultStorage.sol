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
  );

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
// Write function

  function storeDocument(
    string calldata cid,
    string calldata offchainId,
    bool aiVerified,
    bool isPublic,
    uint8 docType
  ) external {
    if(bytes(cid).length == 0) revert EmptyCID();
    if (bytes(offchainId).length == 0) revert EmptyOffchainId();
    if (_cidExists[cid]) revert CIDAlreadyExists(cid);

    _documents[cid] = Document({
      cid: cid,
      offchainId: offchainId,
      owner: msg.sender,
      storedAt: block.timestamp,
      aiVerified: aiVerified,
      isPublic: isPublic,
      docType: docType
    });
    _ownerDocs[msg.sender].push(cid);
    _cidExists[cid] = true;
    totalDocuments++;

    emit DocumentStored(msg.sender, cid, offchainId, block.timestamp, aiVerified);


  }
  function setPublic(string calldata cid, bool isPublic)
  external
  docExists(cid)
  onlyDocOwner(cid)
  {
    _documents[cid].isPublic = isPublic;
    emit DocumentVisibilityChanged(cid, isPublic);
  }
  function getDocument(string calldata cid)
  external
  view
  docExists(cid)
  returns (Document memory)
    {
      return _documents[cid];
    }
    //get all CID of 1 address wallet
    function getOwnerCIDs(address owner) external view returns(string[] memory){
      return _ownerDocs[owner];
    }
    //Check CIid exists - by DocVaultAccess
    function cidExists(string calldata cid) external view returns(bool){
      return _cidExists[cid];
    }
    //Get owner of 1 cid - by DocVaultPayment for transfer 
    function getOwner(string calldata cid)
    external
    view
    docExists(cid)
    returns(address)
    {
      return _documents[cid].owner;
    }

}