FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build:linux-x64

FROM alpine:latest

COPY --from=0 /app/dist/mip-linux-x64 /usr/local/bin/mip

RUN chmod +x /usr/local/bin/mip

ENTRYPOINT ["mip"]
CMD ["--help"]