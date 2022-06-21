// SPDX-License-Identifier: MIT

// PRAGMA
pragma solidity ^0.8.0;

// IMPORTS
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

// ERROR_CODES
error FundMe__NotOwner(); // error name needs to be in the following format: 'contractname__errorname'

// NATSPEC
/// @title A contract for crowd funding
/// @author Kayla Stephens
/// @notice This contract is to demo a sample funding contract
/// @dev This implements price feeds as our Library

// INTERFACES

// LIBRARIES

// CONTRACTS
contract FundMe {
    // Type Declarations
    using PriceConverter for uint256;

    // State Variables
    mapping(address => uint256) private s_addressToAmountFunded;
    address[] private s_funders;
    address private immutable i_owner; // Could we make this constant? no! should make it immutable!
    uint256 public constant MINIMUM_USD = 50 * 10**18;
    AggregatorV3Interface private s_priceFeed; // now that our constructor takes a parameter for the priceFeed > we can save an AggregatorV3Interface object as a local variable

    // Events

    // Modifiers
    modifier onlyOwner() {
        // require(msg.sender == owner);
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        _;
    }

    // FUNCTIONS

    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress); // gives us priceFeed address that's variable & modularized, depending on whatever chain that we are on.
        // now we can grab our priceFeedAddress and use it for our PriceConverter.sol
        // no longer need to have it hard coded in our PriceConverter.sol anymore
    }

    /// @notice This function funds this contract
    function fund() public payable {
        require(
            msg.value.getConversionRate(s_priceFeed) >= MINIMUM_USD,
            "You need to spend more ETH!"
        );
        // require(PriceConverter.getConversionRate(msg.value) >= MINIMUM_USD, "You need to spend more ETH!");
        s_addressToAmountFunded[msg.sender] += msg.value;
        s_funders.push(msg.sender);
    }

    function withdraw() public payable onlyOwner {
        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length; // compare > is funderIndex less than s_funders.length? Which means the longer our funders array is, the more times we're going to be *reading from storage* (incredibly expensive!)
            funderIndex++
        ) {
            address funder = s_funders[funderIndex]; // *reading from storage* alot and saving to this memory variable
            s_addressToAmountFunded[funder] = 0; // ...and then *updating our storage* variable with it
        }
        s_funders = new address[](0); // resetting our funders array (no way around it)
        // payable(msg.sender).transfer(address(this).balance);
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    function cheaperWithdraw() public payable onlyOwner {
        address[] memory funders = s_funders; // saved our storage variable into a memory variable > we can read/write from this memory variable which is much cheaper > and then update storage when we're all done
        // mappings can't be in memory
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex]; //using our memory 'funders' array & not s_funders
            s_addressToAmountFunded[funder] = 0; // resetting our funders mapping > using our memory variable instead of storage variable
        }

        s_funders = new address[](0);
        (bool success, ) = i_owner.call{value: address(this).balance}("");
        require(success);
    }

    // VIEW/PURE

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAddressToAmountFunded(address funder)
        public
        view
        returns (uint256)
    {
        return s_addressToAmountFunded[funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }
}
