// Need to create a fake contract to use with our mock

const { network } = require("hardhat")
const {
    developmentChains,
    DECIMALS,
    INITIAL_ANSWER,
} = require("../helper-hh-config")

module.exports = async ({ getNamedAccouts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")
        await deploy("MockV3Aggregator", {
            contract: "MockV3Aggregator",
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_ANSWER], // find these in MockV3Aggregator.sol file in github (under constructor) > add to helper file
        })
        log("Mocks deployed!")
        log("--------------------") //shows that this is the end of this deploy script
    }
}

module.exports.tags = ["all", "mocks"] //use when only running to run scripts with certain tags
// 'yarn hardhat deploy --tags mocks'

// once mock contract is compiled > can now deploy a fake pricefeed to the blockchain
// specify development chains in helper-hh-config.js
