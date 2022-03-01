const deployments = require('../addresses.json')
import fs from 'fs'
import { BigNumber } from 'ethers'
const hre = require('hardhat')

const varFile = '/root/Graph/contracts/scripts/vars.json'

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
  let tx
  const indexer = accounts[0]
  const allocationTokens = hre.ethers.utils.parseEther('100')
  // Get previous allocation details
  let content = JSON.parse(fs.readFileSync(varFile, 'utf8'))
  // const tenderizerAddress = content.tenderizerAddress
  const oldAllocationID = content.allocationId
  let poi = content.poi
  const oldDeploymentID = content.deploymentID
  const poiHash = hre.ethers.utils.solidityKeccak256(['bytes'], [poi])

  // Progress Epochs
  // for (let i = 0; i < 50; i++) {
    // await hre.ethers.provider.send('evm_mine')
     //await EpochManager.runEpoch()
  // }

  tx = await GRT.approve(
    deployments[chainID].Curation.address,
    hre.ethers.utils.parseEther('100'),
  )
  await tx.wait()
  tx = await Curation.mint(oldDeploymentID, hre.ethers.utils.parseEther('100'), 0, { gasLimit: 1000000 })
  try {
   await tx.wait()
  } catch (e) {

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

  tx = await Staking.closeAndAllocate(
    oldAllocationID,
    poiHash,
    indexer.address,
    subgraphDeploymentID1,
    allocationTokens,
    allocationID,
    hre.ethers.constants.HashZero,
    poi,
    { gasLimit: 1000000 },
  )
  const receipt = await tx.wait()

  console.log('Close and allocate status: ', receipt.status)

  // Write allocation ID to file
  content = JSON.parse(fs.readFileSync(varFile, 'utf8'))
  content.allocationId = allocationID
  content.poi = poi
  content.deploymentID = subgraphDeploymentID1 
  fs.writeFileSync(varFile, JSON.stringify(content))
	
  //await delay(200000);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}
