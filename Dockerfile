# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY prompt-pantry-app/package*.json ./prompt-pantry-app/

# Install dependencies
RUN cd prompt-pantry-app && npm install

# Copy project files needed for build
COPY prompt-pantry-app/ ./prompt-pantry-app/
COPY schemas/ ./schemas/

# Build the frontend
RUN cd prompt-pantry-app && npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files and install production dependencies
COPY prompt-pantry-app/package*.json ./prompt-pantry-app/
RUN cd prompt-pantry-app && npm install --omit=dev

# Copy built assets and server
COPY --from=builder /app/prompt-pantry-app/dist ./prompt-pantry-app/dist
COPY prompt-pantry-app/server.js ./prompt-pantry-app/
COPY prompt-pantry-app/serverFactory.js ./prompt-pantry-app/
COPY prompt-pantry-app/server/ ./prompt-pantry-app/server/
COPY schemas/ ./schemas/

# Data directory should be handled via volumes in production, 
# but we ensure it exists.
RUN mkdir -p data

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Port is configurable via the PORT env var; default is 3001
EXPOSE ${PORT}

# Run the server
CMD ["node", "prompt-pantry-app/server.js"]
