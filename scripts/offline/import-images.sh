#!/bin/bash
set -e

IMAGES_FILE="images.tar.gz"

if [ -f "$IMAGES_FILE" ]; then
    echo "📦 Loading Docker Images from $IMAGES_FILE..."
    gunzip -c $IMAGES_FILE | docker load
else
    echo "❌ Error: $IMAGES_FILE not found in current directory."
    exit 1
fi
