// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract AuditLog {
    
    enum EventType {
        CREDENTIAL_ISSUED,
        CREDENTIAL_REVOKED,
        CREDENTIAL_VERIFIED,
        ACCESS_GRANTED,
        ACCESS_DENIED,
        DID_REGISTERED,
        DID_KEY_ROTATED,
        DID_DEACTIVATED,
        STATUS_LIST_CREATED,
        STATUS_LIST_UPDATED
    }
    
    struct AuditEntry {
        uint256 eventId;
        EventType eventType;
        uint256 timestamp;
        string actorDID;
        address actorAddress;
        string subjectDID;
        string credentialId;
        string details;
        bytes32 txHash;
    }
    
    uint256 private eventCounter;
    mapping(uint256 => AuditEntry) public auditEntries;
    mapping(string => uint256[]) public credentialEvents;
    mapping(string => uint256[]) public didEvents;
    mapping(address => uint256[]) public actorEvents;
    uint256[] public allEventIds;
    
    address public didRegistry;
    address public credentialStatusRegistry;
    
    event AuditEntryCreated(
        uint256 indexed eventId,
        EventType eventType,
        string indexed actorDID,
        string indexed credentialId,
        uint256 timestamp
    );
    
    modifier onlyAuthorized() {
        require(
            msg.sender == didRegistry || 
            msg.sender == credentialStatusRegistry ||
            msg.sender == address(this),
            "Only authorized contracts can create entries"
        );
        _;
    }
    
    constructor(address _didRegistry, address _credentialStatusRegistry) {
        require(_didRegistry != address(0), "DID Registry address cannot be zero");
        require(_credentialStatusRegistry != address(0), "Credential Status Registry address cannot be zero");
        
        didRegistry = _didRegistry;
        credentialStatusRegistry = _credentialStatusRegistry;
    }
    
    function logEvent(
        EventType eventType,
        string memory actorDID,
        address actorAddress,
        string memory subjectDID,
        string memory credentialId,
        string memory details
    ) external onlyAuthorized returns (uint256) {
        eventCounter++;
        uint256 newEventId = eventCounter;
        
        AuditEntry memory entry = AuditEntry({
            eventId: newEventId,
            eventType: eventType,
            timestamp: block.timestamp,
            actorDID: actorDID,
            actorAddress: actorAddress,
            subjectDID: subjectDID,
            credentialId: credentialId,
            details: details,
            txHash: blockhash(block.number - 1)
        });
        
        auditEntries[newEventId] = entry;
        allEventIds.push(newEventId);
        
        if (bytes(credentialId).length > 0) {
            credentialEvents[credentialId].push(newEventId);
        }
        
        if (bytes(actorDID).length > 0) {
            didEvents[actorDID].push(newEventId);
        }
        if (bytes(subjectDID).length > 0) {
            didEvents[subjectDID].push(newEventId);
        }
        
        actorEvents[actorAddress].push(newEventId);
        
        emit AuditEntryCreated(newEventId, eventType, actorDID, credentialId, block.timestamp);
        
        return newEventId;
    }
    
    function getAuditEntry(uint256 eventId) 
        external 
        view 
        returns (AuditEntry memory) 
    {
        require(eventId > 0 && eventId <= eventCounter, "Invalid event ID");
        return auditEntries[eventId];
    }
    
    function getCredentialHistory(string memory credentialId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return credentialEvents[credentialId];
    }
    
    function getDIDHistory(string memory did) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return didEvents[did];
    }
    
    function getActorHistory(address actorAddress) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return actorEvents[actorAddress];
    }
    
    function getTotalEvents() external view returns (uint256) {
        return eventCounter;
    }
    
    function queryEventsByTypeAndTimeRange(
        EventType eventType,
        uint256 startTime,
        uint256 endTime
    ) external view returns (uint256[] memory) {
        uint256[] memory matchingEvents = new uint256[](allEventIds.length);
        uint256 matchCount = 0;
        
        for (uint256 i = 0; i < allEventIds.length; i++) {
            AuditEntry memory entry = auditEntries[allEventIds[i]];
            if (
                entry.eventType == eventType &&
                entry.timestamp >= startTime &&
                entry.timestamp <= endTime
            ) {
                matchingEvents[matchCount] = entry.eventId;
                matchCount++;
            }
        }
        
        uint256[] memory result = new uint256[](matchCount);
        for (uint256 i = 0; i < matchCount; i++) {
            result[i] = matchingEvents[i];
        }
        
        return result;
    }
    
    function updateContractReferences(
        address _didRegistry,
        address _credentialStatusRegistry
    ) external {
        require(_didRegistry != address(0), "DID Registry address cannot be zero");
        require(_credentialStatusRegistry != address(0), "Credential Status Registry address cannot be zero");
        
        didRegistry = _didRegistry;
        credentialStatusRegistry = _credentialStatusRegistry;
    }
}
