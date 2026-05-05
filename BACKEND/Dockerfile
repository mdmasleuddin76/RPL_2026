# Stage 1: Build & Dependencies
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Stage 2: Minimal Runtime
FROM node:18-alpine
WORKDIR /app

# Copy built node_modules and source code from Stage 1
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

# CRITICAL: Create the uploads directory so player images can be saved safely
RUN mkdir -p /app/uploads

EXPOSE 3000
CMD ["node", "src/index.js"]