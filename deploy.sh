#!/bin/bash
docker build -t trandung/steam-bot-api .
docker push trandung/steam-bot-api

ssh deploy@$DEPLOY_SERVER << EOF
docker pull trandung/steam-bot-api
docker stop api-boilerplate || true
docker rm api-boilerplate || true
docker rmi trandung/steam-bot-api:current || true
docker tag trandung/steam-bot-api:latest trandung/steam-bot-api:current
docker run -d --restart always --name api-boilerplate -p 8080:8080 trandung/steam-bot-api:current
EOF
