#!/bin/bash
set -e

echo "🚀 Starting JaCode Offline..."

if [ ! -f .env ]; then
    echo "⚠️ .env file not found. Copying .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo "❌ Error: .env.example not found."
        exit 1
    fi
fi

docker-compose -f docker-compose.prod.yml up -d

echo "✅ Services started."
echo "Backend: http://localhost:4000"
echo "Frontend: http://localhost:3000"
