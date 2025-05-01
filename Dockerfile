# backend/Dockerfile
FROM node:18

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build Prisma (optional if you use type generation or client)
RUN npx prisma generate

# Expose port (change if needed)
EXPOSE 4000

# Start the application
CMD ["node", "index.js"]
