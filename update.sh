#!/bin/bash
set -e

echo "Pulling latest changes..."
git pull origin claude/birthday-rsvp-landing-RvvH8

echo "Rebuilding and restarting containers..."
docker compose up --build -d

echo "Done! App running on port 3000."
