#!/bin/bash
ssh -i ~/.ssh/tradewithme_instance admin@Tony-Dung.local@$35.247.168.177 << EOF
git checkout dota-trade-bot
git pull
yarn
yarn docker:prod
EOF
