#!/bin/bash
# Quick rebuild script - just run: bash rebuild.sh

cd "$(dirname "$0")"
chmod +x scripts/docker-rebuild.sh
./scripts/docker-rebuild.sh
