FROM node:14

COPY package.json .
COPY yarn.lock .
RUN yarn --frozen-lockfile

COPY . .

EXPOSE 8080
CMD ["yarn", "start"]