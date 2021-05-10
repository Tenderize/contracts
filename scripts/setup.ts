const deployments = require('../addresses.json')

const hre = require('hardhat')

const randomHexBytes = (n = 32): string => hre.ethers.utils.hexlify(hre.ethers.utils.randomBytes(n))

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
  const RewardsManager = await hre.ethers.getContractAt(
    'RewardsManager',
    deployments['1337'].RewardsManager.address,
  )
  const Curation = await hre.ethers.getContractAt('Curation', deployments['1337'].Curation.address)

  // unpause protocol
  await Controller.setPaused(false)

  const indexer = accounts[0]
  const delegator = accounts[1]

  // register as indexer
  const allocationTokens = hre.ethers.utils.parseEther('100000')
  await ServiceRegistry.register('http://test.com', 'ajdhg7')
  await GRT.approve(deployments['1337'].Staking.address, allocationTokens)
  await Staking.stake(allocationTokens)

  // Allocate to subgraph
  const w = hre.ethers.Wallet.createRandom()
  const channelKey = {
    privKey: w.privateKey,
    pubKey: w.publicKey,
    address: w.address,
    wallet: w,
    generateProof: (indexerAddress: string): Promise<string> => {
      const messageHash = hre.ethers.utils.solidityKeccak256(
        ['address', 'address'],
        [indexerAddress, w.address],
      )
      const messageHashBytes = hre.ethers.utils.arrayify(messageHash)
      return w.signMessage(messageHashBytes)
    },
  }
  const allocationID = channelKey.address
  const subgraphDeploymentID1 = randomHexBytes()
  await Staking.allocate(
    subgraphDeploymentID1,
    allocationTokens,
    allocationID,
    hre.ethers.constants.HashZero,
    await channelKey.generateProof(indexer.address),
  )
  await GRT.approve(deployments['1337'].Curation.address, hre.ethers.utils.parseEther('10000'))
  await Curation.mint(subgraphDeploymentID1, hre.ethers.utils.parseEther('1000'), 0)

  // Delegate to indexer
  await GRT.mint(delegator.address, hre.ethers.utils.parseEther('10000'))

  await GRT.connect(delegator).approve(
    deployments['1337'].Staking.address,
    hre.ethers.utils.parseEther('10000'),
  )
  await Staking.connect(delegator).delegate(indexer.address, hre.ethers.utils.parseEther('1000'))

  // Progress Epochs
  await EpochManager.setEpochLength(1)
  for (let i = 0; i < 10; i++) {
    await EpochManager.runEpoch()
  }

  // Close allocation
  await Staking.closeAllocation(allocationID, randomHexBytes())

  // Calculate rewards
  const del = await Staking.getDelegation(indexer.address, delegator.address)
  const delShares = del.shares
  const delPool = await Staking.delegationPools(indexer.address)
  const stake = delShares.mul(delPool.tokens).div(delPool.shares)
  const rewards = stake.sub(hre.ethers.utils.parseEther('10000'))
  console.log('Rewards: ', rewards)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
