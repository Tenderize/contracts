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
  const allocationTokens = hre.ethers.utils.parseEther('100000')
  // Get previous allocation details
  let content = JSON.parse(fs.readFileSync(varFile, 'utf8'))
  const oldAllocationID = content.allocationId
  const oldDeploymentID = content.deploymentID

  
  tx = await GRT.approve(
    deployments[chainID].Curation.address,
    hre.ethers.utils.parseEther('1000000'),
  )
  await tx.wait()
  tx = await Curation.mint(oldDeploymentID, hre.ethers.utils.parseEther('1000000'), 0)
  await tx.wait()

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
