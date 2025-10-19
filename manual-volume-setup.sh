#!/bin/bash

set -e

echo "=== Manual Volume Setup Script ==="
echo "This script will help you set up the volume correctly"
echo ""

cd ~/paissa-bot

echo "Step 1: Stopping all containers..."
docker-compose down
echo "✓ Containers stopped"

echo ""
echo "Step 2: Checking for old bind mount data..."
if [ -d "data" ] && [ -f "data/paissa_bot.db" ]; then
  DB_SIZE=$(du -h data/paissa_bot.db | cut -f1)
  echo "✓ Found existing database in ./data (size: $DB_SIZE)"
  HAS_LOCAL_DB=true
else
  echo "⚠ No local database found in ./data"
  HAS_LOCAL_DB=false
fi

echo ""
echo "Step 3: Removing any existing volume (will recreate)..."
if docker volume inspect paissa-bot-data >/dev/null 2>&1; then
  echo "Removing existing volume 'paissa-bot-data'..."
  docker volume rm paissa-bot-data
  echo "✓ Old volume removed"
fi

echo ""
echo "Step 4: Creating fresh volume..."
docker volume create paissa-bot-data
echo "✓ Volume created"

echo ""
echo "Step 5: Migrating database to volume (if exists)..."
if [ "$HAS_LOCAL_DB" = true ]; then
  docker run --rm \
    -v "$(pwd)/data:/source:ro" \
    -v paissa-bot-data:/dest \
    alpine cp /source/paissa_bot.db /dest/paissa_bot.db
  echo "✓ Database copied to volume"
  
  echo ""
  echo "Verifying copy..."
  docker run --rm -v paissa-bot-data:/data alpine ls -lh /data/paissa_bot.db
else
  echo "⚠ No database to migrate - will start fresh"
fi

echo ""
echo "Step 6: Starting containers with clean volume..."
docker-compose up -d

echo ""
echo "Step 7: Verifying deployment..."
sleep 3
docker-compose ps
echo ""
docker-compose logs --tail=30 bot

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To verify the volume is working:"
echo "  ./diagnose-volume.sh"
echo ""
echo "To check database contents:"
echo "  docker run --rm -v paissa-bot-data:/data alpine ls -lah /data/"
echo ""

