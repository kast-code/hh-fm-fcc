const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hh-config")

// scope of FundMe contract
!developmentChains.includes(network.name) // added during Stage Testing
    ? describe.skip // added during Stage Testing
    : describe("FundMe", async function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          //const sendValue = "1000000000000000000" //value of 1 ETH
          const sendValue = ethers.utils.parseEther("1") //same as above statement

          beforeEach(async function () {
              // need to deploy our fundMe contract
              // using hardhat-deploy
              // const accounts = await ethers.getSigners()
              // const accountZero = accounts[0]
              deployer = (await getNamedAccounts()).deployer // wrap and assign to deployer object
              await deployments.fixture(["all"])
              fundMe = await ethers.getContract("FundMe", deployer) //connects our FundMe contract to our deployer account
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          // scope of constructor
          describe("constructor", async function () {
              it("sets the aggregator addresses correctly", async function () {
                  const response = await fundMe.getPriceFeed() //same getPriceFeed in MV3A since we are testing locally
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          // scope of 'fund' function
          describe("fund", async function () {
              it("Fails if you don't send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!"
                  )
              })

              it("updated the amount funded data structure", async function () {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })

              it("Adds funder to array of s_funders", async function () {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })

          // scope of 'withdraw' function
          describe("withdraw", async function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue }) // now for all of our tests in the withdraw scope - first fund w/ETH
              })

              it("Withdraw ETH from a single founder", async function () {
                  // arrange - get starting balance of FundMe contract and of the deployer
                  const startingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )

                  // act - now we have the starting balances > we can run this withdraw function
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  // gas cost - get the gas cost from this transaction so we can add it to our endingDeployerBal & run assertion
                  const { gasUsed, effectiveGasPrice } = transactionReceipt // pull out gasUsed & effectiveGasPrice from object
                  const gasCost = gasUsed.mul(effectiveGasPrice) // need to use big number functions > .mul (multiply)

                  const endingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )

                  // assert - can check to see if the numbers work out now
                  assert.equal(endingFundMeBal, 0) // this bal should = 0 since we just withdrew all the money
                  assert.equal(
                      startingFundMeBal.add(startingDeployerBal).toString(),
                      endingDeployerBal.add(gasCost).toString()
                  )
              })

              it("allows us to withdraw with multiple s_funders", async function () {
                  // arrange
                  const accounts = await ethers.getSigners() // create multiple different accounts
                  // can loop through these accounts and have each account call the 'fund' function
                  // can do this with a for loop
                  for (let i = 1; i < 6; i++) {
                      // start with index '1' bc index '0' is going to be the deployer
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      // need to call 'connect' function ^ bc our contract is connected to our deployer account

                      // we need to create new objects to connect to all these different accounts
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )

                  // act - call withdraw function
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )

                  // assert
                  assert.equal(endingFundMeBal, 0)
                  assert.equal(
                      startingFundMeBal.add(startingDeployerBal).toString(),
                      endingDeployerBal.add(gasCost).toString()
                  )

                  // ensure s_funders are reset properly
                  // ensure s_funders array in FundMe.sol is reset properly
                  await expect(fundMe.getFunder(0)).to.be.reverted

                  // want to loop through all these account to ensure that our mappings (in FundMe.sol) all their amounts are 0
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })

              // when some other account tries to call the withdraw function it gets reverted
              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  ) // attacker = account object
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWith("FundMe__NotOwner")
              })

              it("cheaperWithdraw testing...", async function () {
                  // arrange
                  const accounts = await ethers.getSigners() // create multiple different accounts
                  // can loop through these accounts and have each account call the 'fund' function
                  // can do this with a for loop
                  for (let i = 1; i < 6; i++) {
                      // start with index '1' bc index '0' is going to be the deployer
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      // need to call 'connect' function ^ bc our contract is connected to our deployer account

                      // we need to create new objects to connect to all these different accounts
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )

                  // act - call withdraw function
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBal = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBal = await fundMe.provider.getBalance(
                      deployer
                  )

                  // assert
                  assert.equal(endingFundMeBal, 0)
                  assert.equal(
                      startingFundMeBal.add(startingDeployerBal).toString(),
                      endingDeployerBal.add(gasCost).toString()
                  )

                  // ensure s_funders are reset properly
                  // ensure s_funders array in FundMe.sol is reset properly
                  await expect(fundMe.getFunder(0)).to.be.reverted

                  // want to loop through all these account to ensure that our mappings (in FundMe.sol) all their amounts are 0
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
          })
      })
