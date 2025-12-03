#!/bin/bash
# Quick Docker Test Script

echo "==================================="
echo "E-Office Docker Quick Test"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo -e "\n${YELLOW}[1/8] Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found: $(docker --version)${NC}"

# Check Docker Compose
echo -e "\n${YELLOW}[2/8] Checking Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose found: $(docker-compose --version)${NC}"

# Stop existing containers
echo -e "\n${YELLOW}[3/8] Stopping existing containers...${NC}"
docker-compose down
echo -e "${GREEN}✓ Containers stopped${NC}"

# Build images
echo -e "\n${YELLOW}[4/8] Building Docker images (this may take 5-10 minutes)...${NC}"
docker-compose build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"

# Start services
echo -e "\n${YELLOW}[5/8] Starting services...${NC}"
docker-compose up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Services started${NC}"

# Wait for services
echo -e "\n${YELLOW}[6/8] Waiting for services to be ready...${NC}"
echo "Waiting for database..."
sleep 10

echo "Waiting for backend..."
for i in {1..30}; do
    if curl -s http://localhost:4000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        docker-compose logs backend
        exit 1
    fi
    sleep 2
done

echo "Waiting for frontend..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend failed to start${NC}"
        docker-compose logs frontend
        exit 1
    fi
    sleep 2
done

# Setup database
echo -e "\n${YELLOW}[7/8] Setting up database...${NC}"
echo "Running Prisma migrations..."
docker-compose exec -T backend npx prisma db push

echo "Running seeds..."
docker-compose exec -T backend node scripts/seed-rbac.js
docker-compose exec -T backend node scripts/seed-document-types.js
docker-compose exec -T backend node scripts/seed-workflows-simple.js
docker-compose exec -T backend node scripts/seed-org-final.js

echo -e "${GREEN}✓ Database setup complete${NC}"

# Show status
echo -e "\n${YELLOW}[8/8] Checking container status...${NC}"
docker-compose ps

# Final message
echo -e "\n${GREEN}==================================="
echo "✓ Docker test complete!"
echo "===================================${NC}"
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:4000"
echo "  Login:    admin@acme.local / admin123"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f          # View all logs"
echo "  docker-compose logs -f backend  # View backend logs"
echo "  docker-compose down             # Stop all services"
echo "  docker-compose restart backend  # Restart backend"
echo ""
