#!/bin/bash
PATH=/opt/someApp/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
. /root/.bashrc
cd /root/Graph/contracts
INFURA_KEY=79c508601e4b4b8296b921f1064220e8 PRIVATE_KEY=182f9c4b5181c9bbf54cb7c142e13157353b62e4be815632a846ba351f3f78b0 CHAINID=4 npx hardhat run --network rinkeby scripts/reward.ts
cd /root/tender-core
PRIVATE_KEY=182f9c4b5181c9bbf54cb7c142e13157353b62e4be815632a846ba351f3f78b0 NETWORK=rinkeby TENDERIZER=Graph npx hardhat run scripts/rebase.ts --network rinkeby
