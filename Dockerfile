FROM oven/bun:alpine

RUN apk update
RUN apk add bash postgresql-client mariadb-client

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install
