// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

interface IAuditLog {
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
    
    function logEvent(
        EventType eventType,
        string memory actorDID,
        address actorAddress,
        string memory subjectDID,
        string memory credentialId,
        string memory details
    ) external returns (uint256);
}
