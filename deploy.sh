#!/bin/bash
ssh -i ~/.ssh/tradewithme_instance admin@$35.247.168.177 << EOF
cd node-research
git checkout dota-trade-bot
git pull
yarn
sudo docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
EOF
