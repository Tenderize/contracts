const deployments = require('../addresses.json')
import { BigNumber } from 'ethers'
const hre = require('hardhat')

const randomHexBytes = (n = 32): string => hre.ethers.utils.hexlify(hre.ethers.utils.randomBytes(n))
export const toBN = (value: string | number): BigNumber => BigNumber.from(value)

async function main() {
  const accounts = await hre.ethers.getSigners()
  const Staking = await hre.ethers.getContractAt('Staking', deployments['31337'].Staking.address)
  const EpochManager = await hre.ethers.getContractAt(
    'EpochManager',
    deployments['31337'].EpochManager.address,
  )

  const indexer = accounts[0]

  const delegationAmount = hre.ethers.utils.parseEther('100000')

  // Set appropriately
  const tenderizerAddress = '0xCD8a1C3ba11CF5ECfa6267617243239504a98d90'
  const allocationID = '0x7aBC8D6D9B3c91ad2ab6608fA8CBE3511017F3A3'

  console.log('Delegation:', await Staking.getDelegation(indexer.address, tenderizerAddress))
  console.log('Pool:', await Staking.delegationPools(indexer.address))

  // Progress Epochs
  await EpochManager.setEpochLength(1)
  for (let i = 0; i < 100; i++) {
    await hre.ethers.provider.send('evm_mine')
    await EpochManager.runEpoch()
  }

  // Close allocation
  await Staking.closeAllocation(allocationID, randomHexBytes())
  console.log('Delegation:', await Staking.getDelegation(indexer.address, tenderizerAddress))
  console.log('Pool:', await Staking.delegationPools(indexer.address))

  // Calculate rewards
  const del = await Staking.getDelegation(indexer.address, tenderizerAddress)
  const delShares = del.shares
  const delPool = await Staking.delegationPools(indexer.address)
  const stake = delShares.mul(delPool.tokens).div(delPool.shares)
  const rewards = stake.sub(delegationAmount)
  console.log('Rewards: ', rewards)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
