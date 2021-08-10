const deployments = require('../addresses.json')
import fs from 'fs'
import { BigNumber } from 'ethers'
const hre = require('hardhat')

const varFile = 'scripts/vars.json'

const randomHexBytes = (n = 32): string => hre.ethers.utils.hexlify(hre.ethers.utils.randomBytes(n))
export const toBN = (value: string | number): BigNumber => BigNumber.from(value)
const chainID = '31337'

async function main() {
  const accounts = await hre.ethers.getSigners()
  const ServiceRegistry = await hre.ethers.getContractAt(
    'ServiceRegistry',
    deployments[chainID].ServiceRegistry.address,
  )
  const GRT = await hre.ethers.getContractAt('GraphToken', deployments[chainID].GraphToken.address)
  const Staking = await hre.ethers.getContractAt('Staking', deployments[chainID].Staking.address)
  const Controller = await hre.ethers.getContractAt(
    'Controller',
    deployments[chainID].Controller.address,
  )
  const EpochManager = await hre.ethers.getContractAt(
    'EpochManager',
    deployments[chainID].EpochManager.address,
  )
  const RewardsManager = await hre.ethers.getContractAt(
    'RewardsManager',
    deployments[chainID].RewardsManager.address,
  )
  const Curation = await hre.ethers.getContractAt('Curation', deployments[chainID].Curation.address)

  // unpause protocol
  await Controller.setPaused(false)
  await EpochManager.setEpochLength(1)

  const indexer = accounts[0]
  const delegator = accounts[1]

  // register as indexer
  const allocationTokens = hre.ethers.utils.parseEther('100000')
  await ServiceRegistry.register('http://test.com', 'ajdhg7')
  await GRT.approve(deployments[chainID].Staking.address, allocationTokens)
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

  // Write allocation ID to file
  const content = JSON.parse(fs.readFileSync(varFile, 'utf8'))
  content.allocationId = allocationID
  fs.writeFileSync(varFile, JSON.stringify(content))

  const subgraphDeploymentID1 = randomHexBytes()
  await Staking.allocate(
    subgraphDeploymentID1,
    allocationTokens,
    allocationID,
    hre.ethers.constants.HashZero,
    await channelKey.generateProof(indexer.address),
  )

  await Staking.setDelegationParameters(toBN('823000'), toBN('80000'), 5)

  await GRT.approve(deployments[chainID].Curation.address, hre.ethers.utils.parseEther('1000000'))
  await Curation.mint(subgraphDeploymentID1, hre.ethers.utils.parseEther('1000000'), 0)

  // Delegate to indexer
  // await GRT.mint(delegator.address, delegationAmount)

  // await GRT.connect(delegator).approve(deployments[chainID].Staking.address, delegationAmount)
  // await Staking.connect(delegator).delegate(indexer.address, delegationAmount)

  console.log('AllocationID: ', allocationID)
  console.log('Indexer Address: ', indexer.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
