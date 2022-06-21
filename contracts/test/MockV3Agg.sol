// SPDX-License-Identifier: MIT

// we are going to define our own (fake) mock price feed aggregator ourselves by importing a test mock already created by chainlink

pragma solidity ^0.6.0; // if compiler version doesn't match > can add multiple solidity versions in hardhat.config.js

import "@chainlink/contracts/src/v0.6/tests/MockV3Aggregator.sol";
