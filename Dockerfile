FROM node:8-alpine

EXPOSE 8080

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
ENV JWT_SECRET $JWT_SECRET
ENV JWT_EXPIRATION_MINUTES $JWT_EXPIRATION_MINUTES
ENV DOTA2_ID $DOTA2_ID
ENV DOTA2_CONTEXT $DOTA2_CONTEXT
ENV STEAM_API_KEY $STEAM_API_KEY
ENV GOOGLE_CLOUD_PROJECT_ID $GOOGLE_CLOUD_PROJECT_ID

RUN mkdir /app
WORKDIR /app
ADD package.json yarn.lock /app/
RUN yarn --pure-lockfile
ADD . /app

CMD ["yarn", "docker:start"]
