# Dockerfile for CareCircle Backend API
# This Dockerfile works when Railway builds from repository root
FROM node:18-alpine

# Install build dependencies for native modules (better-sqlite3 needs these)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files from apps/api
COPY apps/api/package*.json ./

# Install dependencies
RUN npm install

# Copy source code from apps/api/src
COPY apps/api/src ./src

# Create directory for SQLite database
RUN mkdir -p /app/data

# Expose port (Railway uses PORT env var, defaults to 3005)
EXPOSE 3005

# Set default environment variables
ENV PORT=3005
ENV NODE_ENV=production
ENV DB_FILE=/app/data/carecircle-application.db

# Start the server
CMD ["node", "src/index.js"]
