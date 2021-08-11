const deployments = require('../addresses.json')
import fs from 'fs'
import { BigNumber } from 'ethers'
import { keccak256 } from 'ethers/lib/utils'
const hre = require('hardhat')

const varFile = 'scripts/vars.json'

const randomHexBytes = (n = 32): string => hre.ethers.utils.hexlify(hre.ethers.utils.randomBytes(n))
export const toBN = (value: string | number): BigNumber => BigNumber.from(value)
const chainID = process.env.CHAINID

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
  let tx = await GRT.approve(deployments[chainID].Staking.address, allocationTokens)
  await tx.wait()
  tx = await Staking.stake(allocationTokens)
  await tx.wait()

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
  const poi = await channelKey.generateProof(indexer.address)
  tx = await Staking.allocate(
    subgraphDeploymentID1,
    allocationTokens,
    allocationID,
    hre.ethers.constants.HashZero,
    poi,
  )
  await tx.wait()

  // Write allocation ID to file
  const content = JSON.parse(fs.readFileSync(varFile, 'utf8'))
  content.allocationId = allocationID
  content.poi = poi
  fs.writeFileSync(varFile, JSON.stringify(content))

  await Staking.setDelegationParameters(toBN('823000'), toBN('80000'), 5)

  tx = await GRT.approve(
    deployments[chainID].Curation.address,
    hre.ethers.utils.parseEther('10000000'),
  )
  await tx.wait()
  tx = await Curation.mint(subgraphDeploymentID1, hre.ethers.utils.parseEther('1000000'), 0)
  await tx.wait()
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
