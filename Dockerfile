#------------Stage 1: Build Stage----------------
FROM node:20 AS builder

# Set working directory.
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies.
RUN npm install

# Copy the rest of the application.
COPY . .

# Generate the prisma client.
RUN npm run db:generate

# Build the application.
RUN npm run build

# Copy prisma engine to dist.
RUN npm run db:prisma-engine-fix

# Get rid of dev-deps.
RUN npm prune --production

#------------Stage 2: Production Stage---------------
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port 8000
EXPOSE 8000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Run application.
CMD ["node", "dist/index.js"]
