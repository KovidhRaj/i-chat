FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY prisma ./prisma
RUN npx prisma generate

COPY  . .

EXPOSE 3000

CMD npx prisma migrate deploy && node src/index.js