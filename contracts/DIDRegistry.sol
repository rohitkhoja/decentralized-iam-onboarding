// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract DIDRegistry {
    
    struct DIDDocument {
        string did;
        address controller;
        bytes publicKey;
        string keyType;
        uint256 createdAt;
        uint256 updatedAt;
        bool isActive;
    }
    
    mapping(string => DIDDocument) public didDocuments;
    mapping(address => string[]) public controllerToDIDs;
    mapping(string => bytes[]) public didKeyHistory;
    
    event DIDRegistered(
        string indexed did,
        address indexed controller,
        bytes publicKey,
        uint256 timestamp
    );
    
    event DIDKeyRotated(
        string indexed did,
        bytes oldPublicKey,
        bytes newPublicKey,
        uint256 timestamp
    );
    
    event DIDDeactivated(
        string indexed did,
        uint256 timestamp
    );
    
    modifier onlyController(string memory did) {
        require(didDocuments[did].controller == msg.sender, "Only controller can do this");
        require(didDocuments[did].isActive, "DID not active");
        _;
    }
    
    function registerDID(
        string memory did,
        bytes memory publicKey,
        string memory keyType
    ) external {
        require(bytes(did).length > 0, "DID cannot be empty");
        require(didDocuments[did].controller == address(0), "DID already exists");
        require(publicKey.length > 0, "Public key cannot be empty");
        
        didDocuments[did] = DIDDocument({
            did: did,
            controller: msg.sender,
            publicKey: publicKey,
            keyType: keyType,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            isActive: true
        });
        
        controllerToDIDs[msg.sender].push(did);
        didKeyHistory[did].push(publicKey);
        
        emit DIDRegistered(did, msg.sender, publicKey, block.timestamp);
    }
    
    function rotateKey(
        string memory did,
        bytes memory newPublicKey,
        string memory keyType
    ) external onlyController(did) {
        require(newPublicKey.length > 0, "New public key cannot be empty");
        
        bytes memory oldPublicKey = didDocuments[did].publicKey;
        didDocuments[did].publicKey = newPublicKey;
        didDocuments[did].keyType = keyType;
        didDocuments[did].updatedAt = block.timestamp;
        
        didKeyHistory[did].push(newPublicKey);
        
        emit DIDKeyRotated(did, oldPublicKey, newPublicKey, block.timestamp);
    }
    
    function deactivateDID(string memory did) external onlyController(did) {
        didDocuments[did].isActive = false;
        didDocuments[did].updatedAt = block.timestamp;
        
        emit DIDDeactivated(did, block.timestamp);
    }
    
    function getDIDDocument(string memory did) 
        external 
        view 
        returns (DIDDocument memory) 
    {
        return didDocuments[did];
    }
    
    function isDIDActive(string memory did) external view returns (bool) {
        return didDocuments[did].isActive;
    }
    
    function getPublicKey(string memory did) external view returns (bytes memory) {
        require(didDocuments[did].controller != address(0), "DID does not exist");
        return didDocuments[did].publicKey;
    }
    
    function getDIDsByController(address controller) 
        external 
        view 
        returns (string[] memory) 
    {
        return controllerToDIDs[controller];
    }
    
    function getKeyHistory(string memory did) 
        external 
        view 
        returns (bytes[] memory) 
    {
        return didKeyHistory[did];
    }
}
