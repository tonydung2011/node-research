#!/bin/bash
ssh -i ~/.ssh/tradewithme_instance admin@$35.247.168.177 << EOF
cd node-research
git checkout dota-trade-bot
git pull
yarn
yarn docker:prod
EOF
