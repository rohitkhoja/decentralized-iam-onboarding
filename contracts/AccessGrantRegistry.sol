pragma solidity ^0.8.20;

contract AccessGrantRegistry {
    
    struct AccessGrant {
        string holderDID;
        string credentialId;
        string[] accessGroups;
        string issuerDID;
        uint256 issuedAt;
        uint256 expiresAt;
        bool isActive;
    }
    
    mapping(string => AccessGrant[]) public holderAccessGrants;
    mapping(string => AccessGrant) public credentialToGrant;
    mapping(string => string[]) public holderToCredentialIds;
    
    event AccessGranted(
        string indexed holderDID,
        string indexed credentialId,
        string[] accessGroups,
        string indexed issuerDID,
        uint256 expiresAt
    );
    
    event AccessRevoked(
        string indexed holderDID,
        string indexed credentialId
    );
    
    function grantAccess(
        string memory holderDID,
        string memory credentialId,
        string[] memory accessGroups,
        string memory issuerDID,
        uint256 expiresAt
    ) external {
        require(bytes(holderDID).length > 0, "Holder DID cannot be empty");
        require(bytes(credentialId).length > 0, "Credential ID cannot be empty");
        require(accessGroups.length > 0, "Access groups cannot be empty");
        require(expiresAt > block.timestamp, "Expiration must be in the future");
        require(credentialToGrant[credentialId].issuedAt == 0, "Credential ID already exists");
        
        AccessGrant memory grant = AccessGrant({
            holderDID: holderDID,
            credentialId: credentialId,
            accessGroups: accessGroups,
            issuerDID: issuerDID,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true
        });
        
        holderAccessGrants[holderDID].push(grant);
        credentialToGrant[credentialId] = grant;
        holderToCredentialIds[holderDID].push(credentialId);
        
        emit AccessGranted(holderDID, credentialId, accessGroups, issuerDID, expiresAt);
    }
    
    function revokeAccess(string memory credentialId) external {
        AccessGrant storage grant = credentialToGrant[credentialId];
        require(grant.issuedAt != 0, "Credential ID does not exist");
        
        grant.isActive = false;
        
        emit AccessRevoked(grant.holderDID, credentialId);
    }
    
    function getAccessGrants(string memory holderDID) 
        external 
        view 
        returns (AccessGrant[] memory) 
    {
        return holderAccessGrants[holderDID];
    }
    
    function getActiveAccessGroups(string memory holderDID)
        external
        view
        returns (string[] memory)
    {
        AccessGrant[] memory grants = holderAccessGrants[holderDID];
        string[] memory allGroups;
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < grants.length; i++) {
            if (grants[i].isActive && grants[i].expiresAt > block.timestamp) {
                activeCount += grants[i].accessGroups.length;
            }
        }
        
        allGroups = new string[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < grants.length; i++) {
            if (grants[i].isActive && grants[i].expiresAt > block.timestamp) {
                for (uint256 j = 0; j < grants[i].accessGroups.length; j++) {
                    allGroups[index] = grants[i].accessGroups[j];
                    index++;
                }
            }
        }
        
        return allGroups;
    }
    
    function getCredentialAccessGrant(string memory credentialId)
        external
        view
        returns (AccessGrant memory)
    {
        return credentialToGrant[credentialId];
    }
    
    function hasAccess(string memory holderDID, string memory accessGroup)
        external
        view
        returns (bool)
    {
        AccessGrant[] memory grants = holderAccessGrants[holderDID];
        
        for (uint256 i = 0; i < grants.length; i++) {
            if (!grants[i].isActive || grants[i].expiresAt <= block.timestamp) {
                continue;
            }
            
            for (uint256 j = 0; j < grants[i].accessGroups.length; j++) {
                if (keccak256(bytes(grants[i].accessGroups[j])) == keccak256(bytes(accessGroup))) {
                    return true;
                }
            }
        }
        
        return false;
    }
}

