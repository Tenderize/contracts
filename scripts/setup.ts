const deployments = require('../addresses.json')

const hre = require('hardhat')

async function main() {
  const accounts = await hre.ethers.getSigners()
  const ServiceRegistry = await hre.ethers.getContractAt(
    'ServiceRegistry',
    deployments['1337'].ServiceRegistry.address,
  )
  const GRT = await hre.ethers.getContractAt('GraphToken', deployments['1337'].GraphToken.address)
  const Staking = await hre.ethers.getContractAt('Staking', deployments['1337'].Staking.address)
  const Controller = await hre.ethers.getContractAt(
    'Controller',
    deployments['1337'].Controller.address,
  )
  const EpochManager = await hre.ethers.getContractAt(
    'EpochManager',
    deployments['1337'].EpochManager.address,
  )

  // unpause protocol
  await Controller.setPaused(false)

  // register as indexer
  await ServiceRegistry.register('http://test.com', 'ajdhg7')
  await GRT.approve(deployments['1337'].Staking.address, hre.ethers.utils.parseEther('100000'))
  await Staking.stake(hre.ethers.utils.parseEther('100000'))

  const delegator = accounts[1]
  await GRT.mint(delegator.address, hre.ethers.utils.parseEther('10000'))

  // Delegate to indexer
  await GRT.connect(delegator).approve(
    deployments['1337'].Staking.address,
    hre.ethers.utils.parseEther('10000'),
  )
  await Staking.connect(delegator).delegate(
    accounts[0].address,
    hre.ethers.utils.parseEther('1000'),
  )

  console.log(await Staking.getDelegation(accounts[0].address, delegator.address))

  // Progress Epochs
  // await EpochManager.setEpochLength(1)
  console.log(await EpochManager.currentEpoch())
  console.log(await EpochManager.blockNum())
  for (let i = 0; i < 10; i++) {
    await EpochManager.runEpoch()
  }
  console.log(await EpochManager.currentEpoch())
  console.log(await EpochManager.blockNum())

  // Check rewards
  console.log(await Staking.getDelegation(accounts[0].address, delegator.address))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
