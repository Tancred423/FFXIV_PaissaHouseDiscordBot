#!/bin/bash

set -e

echo "================================================"
echo "   COMPLETE VOLUME RESET AND VERIFICATION"
echo "================================================"
echo ""
echo "This script will:"
echo "  1. Backup your existing database (if any)"
echo "  2. Remove all old containers and images"
echo "  3. Remove and recreate the volume"
echo "  4. Pull fresh images"
echo "  5. Restore your database to the new volume"
echo "  6. Start the bot"
echo "  7. Verify everything is working"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

cd ~/paissa-bot

echo ""
echo "=== Step 1: Create comprehensive backup ==="
mkdir -p data_backup
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ -d "data" ] && [ -f "data/paissa_bot.db" ]; then
  cp data/paissa_bot.db "data_backup/local_${BACKUP_TIMESTAMP}.db"
  echo "✓ Backed up local database"
fi

if docker volume inspect paissa-bot-data >/dev/null 2>&1; then
  docker run --rm \
    -v paissa-bot-data:/data:ro \
    -v $(pwd)/data_backup:/backup \
    alpine cp /data/paissa_bot.db "/backup/volume_${BACKUP_TIMESTAMP}.db" 2>/dev/null || echo "No database in volume to backup"
  echo "✓ Backed up volume database"
fi

echo ""
echo "=== Step 2: Stop and remove containers ==="
docker-compose down -v 2>/dev/null || echo "No containers to stop"
docker rm -f paissa-house-bot 2>/dev/null || echo "No container to remove"

echo ""
echo "=== Step 3: Remove ALL old images ==="
docker images | grep paissa-house-discord-bot | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || echo "No images to remove"
docker image prune -f

echo ""
echo "=== Step 4: Remove and recreate volume ==="
docker volume rm paissa-bot-data 2>/dev/null || echo "No volume to remove"
docker volume create paissa-bot-data
echo "✓ Fresh volume created"

echo ""
echo "=== Step 5: Pull fresh image ==="
docker-compose pull

echo ""
echo "=== Step 6: Verify image is clean ==="
echo "Checking for database files in image..."
if docker run --rm ghcr.io/tancred423/paissa-house-discord-bot:latest find /app -name "*.db" 2>/dev/null | grep -q ".db"; then
  echo "✗ ERROR: Image contains database files!"
  echo "The GitHub Actions build needs to run with the .dockerignore in place."
  echo "Please commit the .dockerignore and trigger a new build."
  exit 1
else
  echo "✓ Image is clean (no database files)"
fi

echo ""
echo "=== Step 7: Restore database to new volume ==="
LATEST_BACKUP=$(ls -t data_backup/*.db 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
  echo "Restoring from: $LATEST_BACKUP"
  docker run --rm \
    -v $(pwd)/data_backup:/backup:ro \
    -v paissa-bot-data:/data \
    alpine cp "/backup/$(basename $LATEST_BACKUP)" /data/paissa_bot.db
  echo "✓ Database restored"
else
  echo "⚠ No backup found - will start with fresh database"
fi

echo ""
echo "=== Step 8: Verify volume contents ==="
docker run --rm -v paissa-bot-data:/data alpine ls -lah /data/

echo ""
echo "=== Step 9: Start containers ==="
docker-compose up -d

echo ""
echo "=== Step 10: Wait for startup ==="
sleep 5

echo ""
echo "=== Step 11: Check container logs ==="
docker-compose logs --tail=50 bot

echo ""
echo "=== Step 12: Verify database accessibility ==="
if docker exec paissa-house-bot ls -lah /app/data/paissa_bot.db 2>/dev/null; then
  echo "✓ Container can access database file"
  docker exec paissa-house-bot ls -lh /app/data/paissa_bot.db
else
  echo "✗ ERROR: Container cannot access database file"
  exit 1
fi

echo ""
echo "=== Step 13: Test database persistence ==="
echo "Checking database content..."
docker exec paissa-house-bot sh -c "ls -lh /app/data/paissa_bot.db"

echo ""
echo "================================================"
echo "✓ COMPLETE RESET SUCCESSFUL"
echo "================================================"
echo ""
echo "Your database is now in volume 'paissa-bot-data'"
echo ""
echo "Next steps:"
echo "  1. Test the bot functionality"
echo "  2. Add some data (configure a channel)"
echo "  3. Restart: docker-compose restart"
echo "  4. Verify data persists: ./diagnose-volume.sh"
echo "  5. If data persists, deploy again to test full cycle"
echo ""
echo "Backups saved in: data_backup/"
ls -lh data_backup/
echo ""

