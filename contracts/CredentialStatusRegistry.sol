// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract CredentialStatusRegistry {
    
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
        _;
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
        string memory,
        bytes32[] memory,
        uint256
    ) external view returns (bool) {
        return !revokedCredentials[credentialId];
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
