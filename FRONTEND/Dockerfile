# Stage 1: Build the React Application
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy our custom Nginx config for SSL and API Proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled React files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]