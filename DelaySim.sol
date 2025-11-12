// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DelaySim {
    event TxRecorded(address indexed sender, string action, uint timestamp);

    function recordAction(string memory action) public {
        emit TxRecorded(msg.sender, action, block.timestamp);
    }
}
