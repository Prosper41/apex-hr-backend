#!/bin/bash
# update.sh
set -e

echo "Pulling latest changes..."
git fetch origin
git pull origin master

echo "Updating containers..."
docker compose down
docker compose up --build -d

echo "Done!"
docker compose ps