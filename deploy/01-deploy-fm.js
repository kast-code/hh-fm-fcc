const { getNamedAccounts, deployments, network } = require("hardhat") // need to add 'network' so we are able to use with hardhat
const { networkConfig, developmentChains } = require("../helper-hh-config") // pull out networkConfig from helper-hh-config
const { verify } = require("../utils/verify")

// js has something called syntactic sugar so we can actually just write this out in 1 line like below
module.exports = async ({ getNamedAccouts, deployments }) => {
    const { deploy, log } = deployments // going to pull these 2 funcs from the deployments object ^
    const { deployer } = await getNamedAccounts() //going to pull deployer func from getNamedAccounts function
    //need to add namedAccounts function to hardhat.config.js
    const chainId = network.config.chainId

    // if chainId = X use address Y
    // if chainId = Z use address A
    // to setup this logic > create a new 'helper' config file (using AAVE protocol)

    //const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    //will pull priceFeed from whichever network is specified
    //need to remember to add networks to helper-hh-config.js & hardhat.config.js

    let ethUsdPriceFeedAddress //instead of having as constant variable > let allows us to update the pricefeed
    if (developmentChains.includes(network.name)) {
        //local dev chain
        const ethUsdAggregator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        //test net chain
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    //if contract does not exist, we deploy a minimal version > for our local testing
    // > created 00-deploy-mocks.js file

    // when going for localhost or hardhat network we want to use a mock
    // in order to deploy a contract we use the contract factories
    const args = [ethUsdPriceFeedAddress]
    const fundMe = await deploy("FundMe", {
        from: deployer, //who is deploying this
        args: args, // going to pass any arguments to the constructor > only added 1 arg in FundMe.sol (priceFeed)
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, args)
        //instead of putting verify code in deploy script - verify code will be put in file under utils folder
    }
    log("---------------------------")
}

module.exports.tags = ["all", "fundme"]
