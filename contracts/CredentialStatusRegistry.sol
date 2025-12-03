pragma solidity ^0.8.20;

import "./MerkleProof.sol";
import "./IAuditLog.sol";

contract CredentialStatusRegistry {
    IAuditLog public auditLog;
    bool public auditLogEnabled;
    
    struct StatusList {
        string statusListId;
        string issuerDID;
        bytes32 rootHash;
        uint256 listSize;
        uint256 revokedCount;
        uint256 createdAt;
        uint256 updatedAt;
        string statusListURI;
        bool isActive;
    }
    
    mapping(string => StatusList) public statusLists;
    mapping(string => string[]) public issuerToStatusLists;
    mapping(string => bool) public revokedCredentials;
    mapping(string => uint256) public revocationTimestamps;
    mapping(string => address) public issuerAddresses;
    
    event StatusListCreated(
        string indexed statusListId,
        string indexed issuerDID,
        bytes32 rootHash,
        uint256 listSize,
        uint256 timestamp
    );
    
    event StatusListUpdated(
        string indexed statusListId,
        bytes32 newRootHash,
        uint256 revokedCount,
        uint256 timestamp
    );
    
    event CredentialRevoked(
        string indexed credentialId,
        string indexed statusListId,
        string reason,
        uint256 timestamp
    );
    
    event CredentialUnrevoked(
        string indexed credentialId,
        string indexed statusListId,
        uint256 timestamp
    );
    
    modifier onlyIssuer(string memory statusListId) {
        require(bytes(statusLists[statusListId].statusListId).length > 0, "Status list does not exist");
        require(statusLists[statusListId].isActive, "Status list not active");
        address issuerAddr = issuerAddresses[statusLists[statusListId].issuerDID];
        require(issuerAddr == address(0) || issuerAddr == msg.sender, "Only issuer can perform this action");
        _;
    }
    
    function registerIssuer(string memory issuerDID, address issuerAddress) external {
        require(bytes(issuerDID).length > 0, "Issuer DID cannot be empty");
        require(issuerAddress != address(0), "Issuer address cannot be zero");
        issuerAddresses[issuerDID] = issuerAddress;
    }
    
    function updateIssuerAddress(string memory issuerDID, address newIssuerAddress) external {
        require(bytes(issuerDID).length > 0, "Issuer DID cannot be empty");
        require(issuerAddresses[issuerDID] == msg.sender, "Only current issuer can update");
        require(newIssuerAddress != address(0), "New issuer address cannot be zero");
        issuerAddresses[issuerDID] = newIssuerAddress;
    }
    
    function getIssuerAddress(string memory issuerDID) external view returns (address) {
        return issuerAddresses[issuerDID];
    }
    
    function setAuditLog(address _auditLog) external {
        require(_auditLog != address(0), "Audit log address cannot be zero");
        auditLog = IAuditLog(_auditLog);
        auditLogEnabled = true;
    }
    
    function disableAuditLog() external {
        auditLogEnabled = false;
    }
    
    function _logEvent(
        IAuditLog.EventType eventType,
        string memory actorDID,
        string memory credentialId,
        string memory details
    ) internal {
        if (auditLogEnabled && address(auditLog) != address(0)) {
            auditLog.logEvent(
                eventType,
                actorDID,
                msg.sender,
                "",
                credentialId,
                details
            );
        }
    }
    
    function createStatusList(
        string memory statusListId,
        string memory issuerDID,
        bytes32 rootHash,
        uint256 listSize,
        string memory statusListURI
    ) external {
        require(bytes(statusListId).length > 0, "Status list ID cannot be empty");
        require(bytes(statusLists[statusListId].statusListId).length == 0, "Status list already exists");
        require(rootHash != bytes32(0), "Root hash cannot be zero");
        require(listSize > 0, "List size must be greater than zero");
        
        if (issuerAddresses[issuerDID] != address(0)) {
            require(issuerAddresses[issuerDID] == msg.sender, "Only registered issuer can create status list");
        } else {
            issuerAddresses[issuerDID] = msg.sender;
        }
        
        statusLists[statusListId] = StatusList({
            statusListId: statusListId,
            issuerDID: issuerDID,
            rootHash: rootHash,
            listSize: listSize,
            revokedCount: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            statusListURI: statusListURI,
            isActive: true
        });
        
        issuerToStatusLists[issuerDID].push(statusListId);
        
        emit StatusListCreated(statusListId, issuerDID, rootHash, listSize, block.timestamp);
        
        _logEvent(
            IAuditLog.EventType.STATUS_LIST_CREATED,
            issuerDID,
            "",
            string(abi.encodePacked("Status list created with size: ", _uint2str(listSize)))
        );
    }
    
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    function updateStatusList(
        string memory statusListId,
        bytes32 newRootHash,
        uint256 revokedCount
    ) external onlyIssuer(statusListId) {
        require(newRootHash != bytes32(0), "Root hash cannot be zero");
        require(revokedCount <= statusLists[statusListId].listSize, "Revoked count exceeds list size");
        
        statusLists[statusListId].rootHash = newRootHash;
        statusLists[statusListId].revokedCount = revokedCount;
        statusLists[statusListId].updatedAt = block.timestamp;
        
        emit StatusListUpdated(statusListId, newRootHash, revokedCount, block.timestamp);
        
        _logEvent(
            IAuditLog.EventType.STATUS_LIST_UPDATED,
            statusLists[statusListId].issuerDID,
            "",
            string(abi.encodePacked("Status list updated, revoked count: ", _uint2str(revokedCount)))
        );
    }
    
    function revokeCredential(
        string memory credentialId,
        string memory statusListId,
        string memory reason
    ) external onlyIssuer(statusListId) {
        require(bytes(credentialId).length > 0, "Credential ID cannot be empty");
        
        revokedCredentials[credentialId] = true;
        revocationTimestamps[credentialId] = block.timestamp;
        
        emit CredentialRevoked(credentialId, statusListId, reason, block.timestamp);
        
        _logEvent(
            IAuditLog.EventType.CREDENTIAL_REVOKED,
            statusLists[statusListId].issuerDID,
            credentialId,
            reason
        );
    }
    
    function batchRevokeCredentials(
        string[] memory credentialIds,
        string memory statusListId,
        string memory reason
    ) external onlyIssuer(statusListId) {
        for (uint256 i = 0; i < credentialIds.length; i++) {
            if (bytes(credentialIds[i]).length > 0) {
                revokedCredentials[credentialIds[i]] = true;
                revocationTimestamps[credentialIds[i]] = block.timestamp;
                emit CredentialRevoked(credentialIds[i], statusListId, reason, block.timestamp);
                
                _logEvent(
                    IAuditLog.EventType.CREDENTIAL_REVOKED,
                    statusLists[statusListId].issuerDID,
                    credentialIds[i],
                    reason
                );
            }
        }
    }
    
    function isRevoked(string memory credentialId) external view returns (bool) {
        return revokedCredentials[credentialId];
    }
    
    function getRevocationTimestamp(string memory credentialId) 
        external 
        view 
        returns (uint256) 
    {
        return revocationTimestamps[credentialId];
    }
    
    function getStatusList(string memory statusListId) 
        external 
        view 
        returns (StatusList memory) 
    {
        return statusLists[statusListId];
    }
    
    function verifyCredentialStatus(
        string memory credentialId,
        string memory statusListId,
        bytes32[] memory proof,
        uint256 index
    ) external view returns (bool) {
        require(bytes(statusListId).length > 0, "Status list ID cannot be empty");
        require(bytes(statusLists[statusListId].statusListId).length > 0, "Status list does not exist");
        
        if (revokedCredentials[credentialId]) {
            return false;
        }
        
        bytes32 leaf = keccak256(abi.encodePacked(credentialId, false));
        bytes32 root = statusLists[statusListId].rootHash;
        uint256 listSize = statusLists[statusListId].listSize;
        
        if (proof.length == 0 && listSize == 1) {
            return leaf == root;
        }
        
        require(proof.length > 0, "Proof cannot be empty for non-singleton list");
        require(index < listSize, "Index out of bounds");
        
        return MerkleProof.verifyStatusListProof(proof, root, leaf, index, listSize);
    }
    
    function deactivateStatusList(string memory statusListId) 
        external 
        onlyIssuer(statusListId) 
    {
        statusLists[statusListId].isActive = false;
        statusLists[statusListId].updatedAt = block.timestamp;
    }
    
    function getStatusListsByIssuer(string memory issuerDID) 
        external 
        view 
        returns (string[] memory) 
    {
        return issuerToStatusLists[issuerDID];
    }
}
