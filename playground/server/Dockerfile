FROM node:22-slim

WORKDIR /app

# Install LibreOffice for headless document conversion (PPT/DOCX/XLSX → PDF)
# Also install CJK fonts for proper Chinese/Japanese/Korean text rendering
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice-impress \
      libreoffice-writer \
      libreoffice-calc \
      fonts-noto-cjk \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 5800

# Set production environment
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
