#!/bin/bash

echo "=== Docker Image Verification ==="
echo "This script checks if the Docker image has stale data baked in"
echo ""

IMAGE="ghcr.io/tancred423/paissa-house-discord-bot:latest"

echo "1. Pulling latest image..."
docker pull $IMAGE

echo ""
echo "2. Checking /app/data in the image (without volume mount)..."
echo "This should be EMPTY or only contain the directory itself:"
docker run --rm $IMAGE ls -lah /app/data/ 2>/dev/null || echo "Directory does not exist in image (this is OK)"

echo ""
echo "3. Checking for any .db files in the image..."
DB_FILES=$(docker run --rm $IMAGE find /app -name "*.db" 2>/dev/null || echo "")
if [ -z "$DB_FILES" ]; then
  echo "✓ No database files found in image (GOOD)"
else
  echo "✗ WARNING: Database files found in image:"
  echo "$DB_FILES"
  echo ""
  echo "This is BAD - database files should NOT be in the image."
  echo "The image needs to be rebuilt with the .dockerignore file in place."
fi

echo ""
echo "4. Checking .dockerignore effectiveness..."
if docker run --rm $IMAGE ls -la /app/.dockerignore 2>/dev/null; then
  echo "Note: .dockerignore was copied to image (expected)"
else
  echo "Note: .dockerignore not in image (expected)"
fi

echo ""
echo "=== Verification Complete ==="

