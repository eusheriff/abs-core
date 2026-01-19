FROM node:18-alpine

WORKDIR /app

# Install dependencies based on package.json
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Build not required for tsx dev mode, but for prod we might refine this.
# For now, using the start script which uses tsx or node-loader.
# Assuming standard start command. 

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "run", "dev"]
