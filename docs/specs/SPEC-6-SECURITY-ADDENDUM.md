# SPEC-6-ADDENDUM: Bảo Mật Docker Images

## ⚠️ Vấn Đề: Docker Images Có Chứa Source Code

### Docker Image Chứa Gì?

Khi build Docker image, nó **CHỨA TOÀN BỘ**:
- ✅ Source code (TypeScript/JavaScript)
- ✅ node_modules
- ✅ Compiled code (trong /dist)
- ❌ **KHÔNG** chứa .env files (nếu cấu hình đúng)

**Vậy có lộ code không?**
- Nếu image **public** → **CÓ**, ai cũng có thể xem code
- Nếu image **private** → **KHÔNG**, chỉ authorized users

---

## 🔒 Giải Pháp Bảo Vệ

### Solution 1: Private Docker Registry (RECOMMENDED)

**Sử dụng private registry thay vì Docker Hub public**

#### Option A: Docker Hub Private Repository

```bash
# Login to Docker Hub
docker login

# Tag image với username
docker tag eoffice-backend:latest yourname/eoffice-backend:latest

# Push to PRIVATE repository
docker push yourname/eoffice-backend:latest
```

**Pricing**: Docker Hub Free tier = 1 private repo, Pro = unlimited

#### Option B: Self-hosted Registry

```yaml
# docker-compose.registry.yml
version: '3.8'

services:
  registry:
    image: registry:2
    ports:
      - "5000:5000"
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Registry Realm
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /data
    volumes:
      - ./registry-data:/data
      - ./registry-auth:/auth
```

**Setup authentication**:
```bash
# Create password file
mkdir registry-auth
docker run --rm --entrypoint htpasswd httpd:2 \
  -Bbn admin strongpassword > registry-auth/htpasswd

# Start registry
docker-compose -f docker-compose.registry.yml up -d

# Push to private registry
docker tag eoffice-backend:latest localhost:5000/eoffice-backend:latest
docker push localhost:5000/eoffice-backend:latest
```

#### Option C: Cloud Registry Services

**AWS ECR** (Elastic Container Registry):
```bash
# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.ap-southeast-1.amazonaws.com

# Push
docker tag eoffice-backend:latest \
  123456789.dkr.ecr.ap-southeast-1.amazonaws.com/eoffice-backend:latest
docker push 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/eoffice-backend:latest
```

**Google Container Registry (GCR)**:
```bash
gcloud auth configure-docker
docker tag eoffice-backend:latest gcr.io/project-id/eoffice-backend:latest
docker push gcr.io/project-id/eoffice-backend:latest
```

---

### Solution 2: Code Obfuscation (Additional Layer)

**Backend**: Obfuscate JavaScript sau khi compile

```bash
# Install obfuscator
npm install -D javascript-obfuscator
```

**File**: `backend/scripts/obfuscate.js`
```javascript
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

function obfuscateDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      obfuscateDirectory(filePath);
    } else if (file.endsWith('.js')) {
      console.log('Obfuscating:', filePath);
      
      const code = fs.readFileSync(filePath, 'utf8');
      const obfuscated = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        stringArray: true,
        stringArrayThreshold: 0.75
      });
      
      fs.writeFileSync(filePath, obfuscated.getObfuscatedCode());
    }
  });
}

obfuscateDirectory('./dist');
console.log('✅ Obfuscation complete');
```

**Updated Dockerfile**:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production

COPY . .
RUN npm run build

# ✅ Obfuscate compiled code
RUN node scripts/obfuscate.js

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist  # Obfuscated code
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

USER eoffice
CMD ["node", "dist/server.js"]
```

**Frontend**: Next.js đã tự động minify

---

### Solution 3: Remove Source Maps

**Backend**: Không build source maps trong production

```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": false  // ← Không tạo .map files
  }
}
```

**Frontend**: Disable source maps

```javascript
// next.config.mjs
export default {
  productionBrowserSourceMaps: false,  // ← Tắt source maps
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.devtool = false;  // No source maps
    }
    return config;
  }
};
```

---

### Solution 4: Multi-stage Build (Đã có)

**Current Dockerfile đã sử dụng multi-stage** → Giảm thiểu code exposure:

```dockerfile
# Stage 1: Build (chứa source code)
FROM node:20-alpine AS builder
COPY . .
RUN npm run build

# Stage 2: Production (CHỈ chứa compiled code)
FROM node:20-alpine
COPY --from=builder /app/dist ./dist  # ← Chỉ copy dist, không copy src
```

**Lợi ích**:
- Source code TypeScript KHÔNG nằm trong final image
- Chỉ có compiled JavaScript
- Image nhỏ hơn 60%

---

### Solution 5: .dockerignore (CRITICAL)

**File**: `backend/.dockerignore`
```
# Source control
.git
.gitignore

# Environment files (CRITICAL!)
.env
.env.*
!.env.example

# Development files
src/  # ← Không copy source nếu đã build
*.ts  # ← Không copy TypeScript files
tsconfig.json

# Documentation
README.md
docs/
*.md

# Tests
tests/
**/*.test.ts
**/*.spec.ts

# IDE
.vscode/
.idea/

# Logs
logs/
*.log

# Dependencies (sẽ install lại)
node_modules/

# Build artifacts
dist/  # Build trong Docker, không copy từ local
```

**File**: `frontend/.dockerignore`
```
.git
.env*
!.env.example
node_modules/
.next/
out/
README.md
**/*.test.tsx
**/*.spec.tsx
```

---

## 🔐 Best Practices Checklist

### ✅ MUST DO (Critical)

- [ ] **Private Docker Registry** - NEVER push to Docker Hub public
- [ ] **.dockerignore** configured - Block .env files
- [ ] **No .env in image** - Use environment variables at runtime
- [ ] **Multi-stage build** - Separate builder and runtime
- [ ] **Disable source maps** - In production builds
- [ ] **Access control** - Limit who can pull images

### ✅ SHOULD DO (Recommended)

- [ ] **Code obfuscation** - Make reverse engineering harder
- [ ] **Image scanning** - Check for vulnerabilities (Trivy, Snyk)
- [ ] **Signed images** - Docker Content Trust
- [ ] **Regular updates** - Rotate credentials, update dependencies

### ⚠️ NICE TO HAVE (Additional Security)

- [ ] **Encrypted secrets** - Use Docker Secrets or Vault
- [ ] **Runtime encryption** - Encrypt sensitive data at runtime
- [ ] **Network isolation** - Separate networks for services
- [ ] **Read-only filesystem** - Where possible

---

## 🧪 Verify Image Security

### Check what's in the image

```bash
# List files in image
docker run --rm eoffice-backend:latest ls -la /app

# Check for .env files (should be EMPTY)
docker run --rm eoffice-backend:latest find /app -name ".env*"

# Check for source files
docker run --rm eoffice-backend:latest find /app -name "*.ts"

# Inspect image layers
docker history eoffice-backend:latest
```

### Scan for vulnerabilities

```bash
# Install Trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Scan image
trivy image eoffice-backend:latest

# Scan for secrets (API keys, passwords)
trivy image --scanners secret eoffice-backend:latest
```

---

## 📊 Security Comparison

| Method | Security Level | Effort | Cost |
|--------|---------------|--------|------|
| Public Docker Hub | ⚠️ LOW | Easy | Free |
| Private Docker Hub | ✅ MEDIUM | Easy | $5/month |
| Self-hosted Registry | ✅ HIGH | Medium | Server cost |
| AWS ECR / GCR | ✅ VERY HIGH | Medium | ~$0.10/GB |
| + Code Obfuscation | ✅ VERY HIGH | High | Free |
| + Image Encryption | 🔒 MAXIMUM | High | Free |

---

## 🚀 Recommended Setup

### For Small Projects (< 10 users)
```
✅ Docker Hub Private Repository ($5/month)
✅ .dockerignore configured
✅ No source maps
✅ Multi-stage build
```

### For Enterprise (Production)
```
✅ AWS ECR or self-hosted registry
✅ Code obfuscation
✅ Image scanning (Trivy)
✅ Access control (IAM)
✅ Regular security audits
```

---

## 💡 Summary

**Câu trả lời ngắn gọn**:
- Docker image **CÓ** chứa code
- **GIẢI PHÁP**: Dùng **private registry** + proper .dockerignore
- **KHÔNG BAO GIỜ** push production images lên public repo
- **BẮT BUỘC**: Không để .env files trong image

**Trade-off**:
- Public image = Miễn phí nhưng **KHÔNG AN TOÀN**
- Private registry = $5-10/tháng nhưng **AN TOÀN**

→ **Recommendation**: Đầu tư $5/month cho Docker Hub private hoặc dùng AWS ECR
