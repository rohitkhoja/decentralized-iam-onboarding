pragma solidity ^0.8.20;

import "./IAuditLog.sol";

contract DIDRegistry {
    IAuditLog public auditLog;
    bool public auditLogEnabled;
    
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
        string memory subjectDID,
        string memory details
    ) internal {
        if (auditLogEnabled && address(auditLog) != address(0)) {
            auditLog.logEvent(
                eventType,
                actorDID,
                msg.sender,
                subjectDID,
                "",
                details
            );
        }
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
        
        _logEvent(
            IAuditLog.EventType.DID_REGISTERED,
            did,
            did,
            string(abi.encodePacked("DID registered with key type: ", keyType))
        );
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
        
        _logEvent(
            IAuditLog.EventType.DID_KEY_ROTATED,
            did,
            did,
            string(abi.encodePacked("Key rotated to type: ", keyType))
        );
    }
    
    function deactivateDID(string memory did) external onlyController(did) {
        didDocuments[did].isActive = false;
        didDocuments[did].updatedAt = block.timestamp;
        
        emit DIDDeactivated(did, block.timestamp);
        
        _logEvent(
            IAuditLog.EventType.DID_DEACTIVATED,
            did,
            did,
            "DID deactivated"
        );
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
