FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --onnxruntime-node-install-cuda=skip

COPY . .
RUN npm run prisma:generate
RUN npm run build

EXPOSE 4000
CMD ["sh", "-c", "npm run prisma:deploy && node dist/index.js"]
