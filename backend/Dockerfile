FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/

# Install dev deps for build, build, then remove dev deps
RUN npm install && npm run build && npm prune --production

# Create data directory for local fallback
RUN mkdir -p .data uploads

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/server.js"]
