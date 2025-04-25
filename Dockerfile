FROM node:alpine

WORKDIR /app

COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn

COPY tsconfig.json tsconfig.json
COPY src src

CMD ["yarn", "start"]