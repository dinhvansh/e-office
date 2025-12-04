#!/bin/bash

# ============================================
# E-Office Clean Reset Script
# ============================================
# Xóa toàn bộ Docker containers, images, volumes
# để setup lại từ đầu khi gặp lỗi

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}"
echo "╔════════════════════════════════════════╗"
echo "║   ⚠️  E-Office Clean Reset Script     ║"
echo "║   XÓA TẤT CẢ VÀ SETUP LẠI TỪ ĐẦU     ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${YELLOW}Script này sẽ:${NC}"
echo "  1. Stop tất cả containers"
echo "  2. Xóa tất cả containers"
echo "  3. Xóa tất cả images"
echo "  4. Xóa tất cả volumes (DATABASE SẼ MẤT!)"
echo "  5. Xóa tất cả networks"
echo "  6. Xóa .env files"
echo "  7. Xóa storage directory"
echo ""
echo -e "${RED}⚠️  CẢNH BÁO: TẤT CẢ DỮ LIỆU SẼ BỊ XÓA!${NC}"
echo ""

# Confirm
read -p "Bạn có chắc chắn muốn tiếp tục? (yes/NO): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Đã hủy."
    exit 0
fi

echo ""
read -p "Nhập 'DELETE' để xác nhận: " -r
echo
if [[ $REPLY != "DELETE" ]]; then
    echo "Đã hủy."
    exit 0
fi

echo ""
echo -e "${BLUE}Bắt đầu clean reset...${NC}"
echo ""

# ============================================
# 1. Stop all containers
# ============================================
echo -e "${BLUE}[1/8]${NC} Đang stop containers..."

if docker compose ps -q 2>/dev/null | grep -q .; then
    docker compose down
    echo -e "${GREEN}✓${NC} Containers đã được stop"
else
    echo -e "${YELLOW}⚠${NC}  Không có containers đang chạy"
fi

# ============================================
# 2. Remove all e-office containers
# ============================================
echo ""
echo -e "${BLUE}[2/8]${NC} Đang xóa containers..."

CONTAINERS=$(docker ps -a --filter "name=eoffice" -q)
if [ -n "$CONTAINERS" ]; then
    docker rm -f $CONTAINERS
    echo -e "${GREEN}✓${NC} Đã xóa $(echo $CONTAINERS | wc -w) containers"
else
    echo -e "${YELLOW}⚠${NC}  Không có containers để xóa"
fi

# ============================================
# 3. Remove all e-office images
# ============================================
echo ""
echo -e "${BLUE}[3/8]${NC} Đang xóa images..."

IMAGES=$(docker images --filter "reference=*eoffice*" -q)
if [ -n "$IMAGES" ]; then
    docker rmi -f $IMAGES
    echo -e "${GREEN}✓${NC} Đã xóa $(echo $IMAGES | wc -w) images"
else
    echo -e "${YELLOW}⚠${NC}  Không có images để xóa"
fi

# Also remove dangling images
DANGLING=$(docker images -f "dangling=true" -q)
if [ -n "$DANGLING" ]; then
    docker rmi -f $DANGLING 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Đã xóa dangling images"
fi

# ============================================
# 4. Remove all volumes
# ============================================
echo ""
echo -e "${BLUE}[4/8]${NC} Đang xóa volumes..."

VOLUMES=$(docker volume ls --filter "name=eoffice" -q)
if [ -n "$VOLUMES" ]; then
    docker volume rm -f $VOLUMES
    echo -e "${GREEN}✓${NC} Đã xóa $(echo $VOLUMES | wc -w) volumes"
else
    echo -e "${YELLOW}⚠${NC}  Không có volumes để xóa"
fi

# ============================================
# 5. Remove networks
# ============================================
echo ""
echo -e "${BLUE}[5/8]${NC} Đang xóa networks..."

NETWORKS=$(docker network ls --filter "name=eoffice" -q)
if [ -n "$NETWORKS" ]; then
    docker network rm $NETWORKS 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Đã xóa networks"
else
    echo -e "${YELLOW}⚠${NC}  Không có networks để xóa"
fi

# ============================================
# 6. Remove .env files
# ============================================
echo ""
echo -e "${BLUE}[6/8]${NC} Đang xóa .env files..."

if [ -f .env ]; then
    rm .env
    echo -e "${GREEN}✓${NC} Đã xóa .env"
fi

if [ -f backend/.env ]; then
    rm backend/.env
    echo -e "${GREEN}✓${NC} Đã xóa backend/.env"
fi

if [ -f frontend/.env.local ]; then
    rm frontend/.env.local
    echo -e "${GREEN}✓${NC} Đã xóa frontend/.env.local"
fi

if [ -f .credentials.txt ]; then
    rm .credentials.txt
    echo -e "${GREEN}✓${NC} Đã xóa .credentials.txt"
fi

# ============================================
# 7. Remove storage directory
# ============================================
echo ""
echo -e "${BLUE}[7/8]${NC} Đang xóa storage directory..."

if [ -d storage ]; then
    rm -rf storage
    echo -e "${GREEN}✓${NC} Đã xóa storage directory"
else
    echo -e "${YELLOW}⚠${NC}  Storage directory không tồn tại"
fi

# ============================================
# 8. Docker system prune
# ============================================
echo ""
echo -e "${BLUE}[8/8]${NC} Đang dọn dẹp Docker system..."

docker system prune -f --volumes
echo -e "${GREEN}✓${NC} Docker system đã được dọn dẹp"

# ============================================
# Summary
# ============================================
echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║     ✅ CLEAN RESET HOÀN TẤT!          ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Hệ thống đã được reset hoàn toàn.${NC}"
echo ""
echo -e "${YELLOW}Bước tiếp theo:${NC}"
echo "  1. Chạy lại auto-setup:"
echo "     ${GREEN}bash auto-setup.sh${NC}"
echo ""
echo "  2. Hoặc setup thủ công:"
echo "     ${GREEN}docker compose build --no-cache${NC}"
echo "     ${GREEN}docker compose up -d${NC}"
echo ""

# Show disk space freed
echo -e "${BLUE}Disk space:${NC}"
docker system df
echo ""
