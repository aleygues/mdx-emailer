FROM node:alpine

WORKDIR /app

COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn

COPY tsconfig.json tsconfig.json
COPY src src

EXPOSE 3000

CMD ["yarn", "start"]