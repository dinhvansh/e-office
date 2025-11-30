#!/bin/bash
# Script tự động cleanup để tạo Ultra-Minimal version từ core hiện tại
# Usage: bash scripts/create-ultra-minimal.sh

set -e

echo "🚀 Creating Ultra-Minimal E-Signature Version"
echo "=============================================="
echo ""

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        exit 0
    fi
fi

# Create new branch
echo "📝 Step 1: Creating branch 'ultra-minimal'..."
git checkout -b ultra-minimal 2>/dev/null || git checkout ultra-minimal

echo ""
echo "🗑️  Step 2: Removing unnecessary backend modules..."

# Remove workflow-related modules
rm -rf backend/src/modules/workflows
rm -rf backend/src/modules/approvals

# Remove organization structure
rm -rf backend/src/modules/departments
rm -rf backend/src/modules/positions

# Remove RBAC
rm -rf backend/src/modules/roles
rm -rf backend/src/modules/permissions

# Remove document management extras
rm -rf backend/src/modules/documentTypes
rm -rf backend/src/modules/numbering
rm -rf backend/src/modules/external-orgs

echo "✅ Removed 9 backend modules"
echo ""
echo "Remaining modules:"
ls -1 backend/src/modules/

echo ""
echo "🗑️  Step 3: Removing unnecessary frontend pages..."

# Remove workflow pages
rm -rf frontend/app/\(dashboard\)/workflows
rm -rf frontend/app/\(dashboard\)/my-approvals

# Remove org structure pages
rm -rf frontend/app/\(dashboard\)/departments
rm -rf frontend/app/\(dashboard\)/positions

# Remove RBAC pages
rm -rf frontend/app/\(dashboard\)/roles
rm -rf frontend/app/\(dashboard\)/permissions

# Remove document management pages
rm -rf frontend/app/\(dashboard\)/document-types

echo "✅ Removed admin pages"
echo ""
echo "Remaining pages:"
ls -1 frontend/app/\(dashboard\)/

echo ""
echo "📋 Step 4: Next steps (MANUAL)..."
echo ""
echo "1. Update database:"
echo "   cd backend"
echo "   npx prisma migrate dev --name ultra-minimal"
echo ""
echo "2. Update backend/src/router/index.ts:"
echo "   - Remove imports for deleted modules"
echo "   - Remove routes registration"
echo ""
echo "3. Update frontend sidebar navigation:"
echo "   - Edit frontend/components/Sidebar.tsx"
echo "   - Remove links to deleted pages"
echo ""
echo "4. Test core functionality:"
echo "   - Upload document"
echo "   - Add signature fields"
echo "   - Send for signing"
echo "   - Sign document"
echo ""
echo "5. Build and test:"
echo "   bash scripts/deploy.sh"
echo ""
echo "✅ Cleanup complete! Review changes before committing."
echo ""
echo "To see what changed:"
echo "  git status"
echo "  git diff"
