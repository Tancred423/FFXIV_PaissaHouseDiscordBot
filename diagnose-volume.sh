#!/bin/bash

echo "=== Docker Volume Diagnostics ==="
echo ""

echo "1. Checking if volume exists..."
if docker volume inspect paissa-bot-data >/dev/null 2>&1; then
  echo "✓ Volume 'paissa-bot-data' exists"
else
  echo "✗ Volume 'paissa-bot-data' does NOT exist"
  echo ""
  echo "Available volumes:"
  docker volume ls | grep paissa || echo "No paissa-related volumes found"
  exit 1
fi

echo ""
echo "2. Volume details:"
docker volume inspect paissa-bot-data

echo ""
echo "3. Volume contents:"
docker run --rm -v paissa-bot-data:/data:ro alpine ls -lah /data/

echo ""
echo "4. Database file check:"
if docker run --rm -v paissa-bot-data:/data:ro alpine test -f /data/paissa_bot.db; then
  echo "✓ Database file exists"
  echo ""
  echo "Database file details:"
  docker run --rm -v paissa-bot-data:/data:ro alpine ls -lh /data/paissa_bot.db
  echo ""
  echo "Database file size:"
  docker run --rm -v paissa-bot-data:/data:ro alpine du -h /data/paissa_bot.db
else
  echo "✗ Database file does NOT exist"
fi

echo ""
echo "5. Container status:"
docker-compose ps

echo ""
echo "6. Container logs (last 20 lines):"
docker-compose logs --tail=20 bot

echo ""
echo "7. Check if container can access the volume:"
if docker exec paissa-house-bot ls -lah /app/data/paissa_bot.db 2>/dev/null; then
  echo "✓ Container can access database file"
else
  echo "✗ Container cannot access database file"
  echo "Container /app/data contents:"
  docker exec paissa-house-bot ls -lah /app/data/ || echo "Cannot access /app/data"
fi

echo ""
echo "=== Diagnostics Complete ==="

