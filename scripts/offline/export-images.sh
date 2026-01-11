#!/bin/bash
set -e

# Configuration
VERSION="latest"
OUTPUT_DIR="jacode-offline-pack"
IMAGES_FILE="images.tar.gz"

echo "🚀 Starting JaCode Offline Export..."

# Create output directory
mkdir -p $OUTPUT_DIR

# 1. Build Custom Images
echo "📦 Building Backend..."
docker build -t jacode-backend:$VERSION -f backend/Dockerfile .

echo "📦 Building Frontend..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://jacode.koreacb.com \
  -t jacode-frontend:$VERSION -f frontend/Dockerfile .

# 2. Pull External Images
echo "⬇️ Pulling External Images..."
docker pull postgres:16-alpine
docker pull redis:7-alpine

# 3. Save Images
echo "💾 Saving images to $OUTPUT_DIR/$IMAGES_FILE..."
docker save jacode-backend:$VERSION jacode-frontend:$VERSION postgres:16-alpine redis:7-alpine | gzip > $OUTPUT_DIR/$IMAGES_FILE

# 4. Copy Config Files
echo "📄 Copying configuration files..."
cp docker-compose.prod.yml $OUTPUT_DIR/

# Create a robust .env based on example if not exists, but here we just copy example for reference
cp .env.example $OUTPUT_DIR/.env.example

# 5. Create Import/Run Scripts in the package
cat <<EOF > $OUTPUT_DIR/install.sh
#!/bin/bash
set -e

echo "📦 Loading Docker Images..."
gunzip -c $IMAGES_FILE | docker load

echo "🚀 Starting JaCode..."
if [ ! -f .env ]; then
    echo "⚠️ .env file not found. Creating from example..."
    cp .env.example .env
    echo "Please edit .env file to configure your environment."
fi

docker-compose -f docker-compose.prod.yml up -d

echo "✅ Deployment Complete!"
echo "Backend: http://localhost:4000"
echo "Frontend: http://localhost:3000"
EOF

chmod +x $OUTPUT_DIR/install.sh

echo "✅ Export Complete! The package is in '$OUTPUT_DIR/'"
echo "👉 You can now transfer the '$OUTPUT_DIR' folder to the offline machine."
