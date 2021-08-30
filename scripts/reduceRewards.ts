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
  const Staking = await hre.ethers.getContractAt('Staking', deployments[chainID].Staking.address)

  const tx = await Staking.setDelegationParameters(toBN('8230'), toBN('800'), 5)
  await tx.wait()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
