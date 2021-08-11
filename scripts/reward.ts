const deployments = require('../addresses.json')
import fs from 'fs'
import { BigNumber } from 'ethers'
const hre = require('hardhat')

const varFile = 'scripts/vars.json'

const randomHexBytes = (n = 32): string => hre.ethers.utils.hexlify(hre.ethers.utils.randomBytes(n))
export const toBN = (value: string | number): BigNumber => BigNumber.from(value)
const chainID = process.env.CHAINID

async function main() {
  const accounts = await hre.ethers.getSigners()
  const GRT = await hre.ethers.getContractAt('GraphToken', deployments[chainID].GraphToken.address)
  const Curation = await hre.ethers.getContractAt('Curation', deployments[chainID].Curation.address)
  const Staking = await hre.ethers.getContractAt('Staking', deployments[chainID].Staking.address)
  const EpochManager = await hre.ethers.getContractAt(
    'EpochManager',
    deployments[chainID].EpochManager.address,
  )

  const indexer = accounts[0]
  const allocationTokens = hre.ethers.utils.parseEther('100000')
  // Get previous allocation details
  let content = JSON.parse(fs.readFileSync(varFile, 'utf8'))
  // const tenderizerAddress = content.tenderizerAddress
  const oldAllocationID = content.allocationId
  let poi = content.poi
  const poiHash = hre.ethers.utils.solidityKeccak256(['bytes'], [poi])

    // Progress Epochs
    for (let i = 0; i < 10; i++) {
      await hre.ethers.provider.send('evm_mine')
      await EpochManager.runEpoch()
    }

  // Start new allocation
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
  poi = await channelKey.generateProof(indexer.address)

  let tx = await Staking.closeAndAllocate(
    oldAllocationID,
    poiHash,
    indexer.address,
    subgraphDeploymentID1,
    allocationTokens,
    allocationID,
    hre.ethers.constants.HashZero,
    poi,
  )
  const receipt = await tx.wait()

  console.log("Close and allocate status: ", receipt.status)

  // await Staking.setDelegationParameters(toBN('823000'), toBN('80000'), 5)
  tx = await GRT.approve(
    deployments[chainID].Curation.address,
    hre.ethers.utils.parseEther('1000000'),
  )
  await tx.wait()
  await Curation.mint(subgraphDeploymentID1, hre.ethers.utils.parseEther('1000000'), 0)

  // Write allocation ID to file
  content = JSON.parse(fs.readFileSync(varFile, 'utf8'))
  content.allocationId = allocationID
  content.poi = poi
  fs.writeFileSync(varFile, JSON.stringify(content))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
