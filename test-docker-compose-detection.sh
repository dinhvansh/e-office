#!/bin/bash

# Test script to verify docker compose detection logic

echo "Testing Docker Compose detection..."
echo ""

# Detect docker compose command (plugin vs standalone)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
    echo "✓ Found: docker compose (plugin)"
    docker compose version
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
    echo "✓ Found: docker-compose (standalone)"
    docker-compose version
else
    echo "✗ Docker Compose not found"
    exit 1
fi

echo ""
echo "Will use command: $DOCKER_COMPOSE"
echo ""
echo "Testing command execution:"
echo "$ $DOCKER_COMPOSE --help"
$DOCKER_COMPOSE --help | head -5
