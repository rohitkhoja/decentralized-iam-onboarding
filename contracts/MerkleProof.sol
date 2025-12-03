pragma solidity ^0.8.20;

library MerkleProof {
    function verify(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf,
        uint256 index
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (index % 2 == 0) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }

            index = index / 2;
        }

        return computedHash == root;
    }

    function verifyStatusListProof(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf,
        uint256 index,
        uint256 listSize
    ) internal pure returns (bool) {
        require(index < listSize, "Index out of bounds");
        require(proof.length > 0 || listSize == 1, "Invalid proof");
        
        return verify(proof, root, leaf, index);
    }
}

