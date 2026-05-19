pragma solidity ^0.8.28;

import "./DocVaultStorage.sol";

contract DocVaultAccess {
  struct AccessGrant{
    address grantee;
    uint256 expiresAt;
    bool canDownload;
    bool active;
    address grantedBy;
    uint256 grantedAt;
  }

  DocVaultStorage public immutable storageContract;

  mapping(string => mapping(address => AccessGrant))private _grants;

  mapping(string => address[]) private _grantees;

  event AccessGranted(
    string indexed cid,
    address indexed grantee,
    uint256 expiresAt,
    bool canDownload
  );
  event AccessRevoked(string indexed cid, address indexed grantee);

  //Error
  error DocumentNotFound(string cid);
  error NotDocumentOwner(string cid);
  error AccessNotFound(string cid, address grantee);
  error CannotGrantToSelf();

  //Contructor

  constructor(address storageAddress) {
    storageContract = DocVaultStorage(storageAddress);
  }
  
  modifier onlyDocOwner(string calldata cid){
    if (!storageContract.cidExists(cid)) revert DocumentNotFound(cid);
    if (storageContract.getOwner(cid)!= msg.sender) revert NotDocumentOwner(cid);
    _;
  }

  function grantAccess(

    string calldata cid,
    address grantee,
    uint256 expiresAt,
    bool canDownload
  )external onlyDocOwner(cid){
    if (grantee == msg.sender) revert CannotGrantToSelf();

    if(!_grants[cid][grantee].active && _grants[cid][grantee].grantedAt == 0){
      _grantees[cid].push(grantee);
    }

    _grants[cid][grantee] = AccessGrant({
      grantee: grantee,
      expiresAt: expiresAt,
      canDownload: canDownload,
      active: true,
      grantedBy: msg.sender,
      grantedAt: block.timestamp
    });
    emit AccessGranted(cid, grantee, expiresAt, canDownload);
  }

  function grantAccessFromPayment(
    string calldata cid,
    address grantee,
    address docOwner
  )external{
    if(_grants[cid][grantee].grantedAt == 0){
      _grantees[cid].push(grantee);
    }
    _grants[cid][grantee] = AccessGrant({
      grantee: grantee,
      expiresAt: 0,
      canDownload: true,
      active: true,
      grantedBy: docOwner,
      grantedAt: block.timestamp
    });
    emit AccessGranted(cid, grantee, 0, true);
  }

  function revokeAccess(string calldata cid, address grantee)
  external
  onlyDocOwner(cid)
  {
    if(!_grants[cid][grantee].active) revert AccessNotFound(cid, grantee);
    _grants[cid][grantee].active = false;
    emit AccessRevoked(cid, grantee);
  }

  function hasValidAccess(string calldata cid, address user)
  external
  view
  returns (bool)
  {
    // owner always has full rights.
    if (storageContract.cidExists(cid) && storageContract.getOwner(cid) == user)
    {
    return true;
    }
  AccessGrant memory grant = _grants[cid][user];
  if (!grant.active) return false;

  //check date
  if (grant.expiresAt != 0 && block.timestamp > grant.expiresAt){
    return false;
  }
  return true;
  }

  function getGrant(string calldata cid, address grantee)
  external
  view
  returns (AccessGrant memory)
  {
    return _grants[cid][grantee];
  }

  function getGrantees(string calldata cid)
  external
  view
  returns (address[] memory)
  {
    return _grantees[cid];
  }


}