# 📋 Development Rules - Quy tắc phát triển

> **Mục đích**: Đảm bảo code quality, documentation và knowledge sharing trong team

---

## 🎯 Rule 1: Lessons Learned Documentation (MANDATORY)

### Khi nào phải document?

**PHẢI document trong `docs/dev/LESSONS-LEARNED.md` khi**:
- ✅ Fix bất kỳ bug/issue nào
- ✅ Giải quyết vấn đề phức tạp (mất >30 phút để debug)
- ✅ Refactor code quan trọng
- ✅ Phát hiện pattern lỗi lặp lại
- ✅ Học được best practice mới

### Format bắt buộc

```markdown
## [YYYY-MM-DD] Tên lỗi ngắn gọn

**Loại**: Bug/Issue/Refactor/Performance
**Mức độ**: Critical/High/Medium/Low
**Module**: Tên module bị ảnh hưởng

### Vấn đề
Mô tả chi tiết vấn đề gặp phải

### Root Cause
Nguyên nhân gốc rễ của vấn đề

### Solution
Cách fix đã áp dụng

### Prevention
Cách ngăn chặn lỗi tương tự trong tương lai

### Files Changed
- `path/to/file1.ts`
- `path/to/file2.tsx`

### Related Issues
- Link đến issue/PR nếu có
```

### Checklist trước khi commit

- [ ] Đã document lesson learned trong `docs/dev/LESSONS-LEARNED.md`
- [ ] Đã update statistics ở cuối file
- [ ] Đã thêm vào Key Takeaways nếu là pattern quan trọng
- [ ] Đã link đến related docs nếu có

---

## 📁 Rule 2: Spec File Organization (MANDATORY)

### Cấu trúc thư mục docs

```
docs/
├── dev/                          # Development docs
│   ├── LESSONS-LEARNED.md        # ⭐ Lessons từ bugs/issues
│   ├── DEVELOPMENT-RULES.md      # ⭐ File này
│   │
│   ├── features/                 # Feature specs (organized)
│   │   ├── workflow/
│   │   │   ├── FEATURE-WORKFLOW-ENGINE.md
│   │   │   ├── FEATURE-APPROVAL-FLOW.md
│   │   │   └── WORKFLOW-MODES-QUICK-REF.md
│   │   ├── documents/
│   │   │   ├── FEATURE-DOCUMENT-TYPES.md
│   │   │   └── FEATURE-AUTO-NUMBERING.md
│   │   └── signing/
│   │       ├── FEATURE-DIGITAL-SIGNING.md
│   │       └── FEATURE-OTP-VERIFICATION.md
│   │
│   ├── sessions/                 # Session logs (by date)
│   │   ├── 2025-11/
│   │   │   ├── SESSION-2025-11-20-UI-REFACTOR.md
│   │   │   ├── SESSION-2025-11-21-WORKFLOW-BACKEND.md
│   │   │   └── SESSION-2025-11-22-TESTING.md
│   │   └── 2025-12/
│   │
│   ├── issues/                   # Issue analysis
│   │   ├── ISSUE-WORKFLOW-ORDER.md
│   │   ├── ISSUE-OTP-EXPIRY.md
│   │   └── SOLUTION-*.md
│   │
│   ├── guides/                   # How-to guides
│   │   ├── ERROR-HANDLING-GUIDE.md
│   │   ├── UI-TESTING-GUIDE.md
│   │   └── QUICK-START-*.md
│   │
│   └── reports/                  # Reports & summaries
│       ├── PHASE-1-COMPLETE-REPORT.md
│       └── REFACTOR-SUMMARY.md
```

### Naming Convention

**Feature Specs**:
- Format: `FEATURE-{name}.md`
- Example: `FEATURE-WORKFLOW-ENGINE.md`
- Location: `docs/dev/features/{category}/`

**Session Logs**:
- Format: `SESSION-YYYY-MM-DD-{topic}.md`
- Example: `SESSION-2025-11-20-UI-REFACTOR.md`
- Location: `docs/dev/sessions/YYYY-MM/`

**Issues**:
- Format: `ISSUE-{name}.md` hoặc `SOLUTION-{name}.md`
- Example: `ISSUE-WORKFLOW-ORDER.md`
- Location: `docs/dev/issues/`

**Guides**:
- Format: `{TYPE}-GUIDE.md` hoặc `QUICK-START-{name}.md`
- Example: `ERROR-HANDLING-GUIDE.md`
- Location: `docs/dev/guides/`

**Reports**:
- Format: `{PHASE}-COMPLETE-REPORT.md` hoặc `{name}-SUMMARY.md`
- Example: `PHASE-1-COMPLETE-REPORT.md`
- Location: `docs/dev/reports/`

### Checklist khi tạo spec file mới

- [ ] Đặt tên theo convention
- [ ] Đặt vào đúng thư mục category
- [ ] Thêm header với metadata (Date, Author, Status)
- [ ] Link đến related docs
- [ ] Update index file nếu có

---

## 🔄 Rule 3: Root Cause Analysis (MANDATORY)

### Khi fix bug, PHẢI làm theo thứ tự:

1. **Identify Root Cause** (Tìm nguyên nhân gốc)
   - Không chỉ fix lỗi hiện tại
   - Tìm hiểu TẠI SAO lỗi xảy ra
   - Trace back đến nguồn gốc của vấn đề

2. **Categorize Error Source** (Phân loại nguồn gốc lỗi)
   
   **A. Configuration Error** (Lỗi cấu hình)
   - User chưa setup đúng
   - Missing data trong database
   - Thiếu environment variables
   - **Action**: Thêm validation + user-friendly error message
   
   **B. User Input Error** (Lỗi do người dùng)
   - User nhập sai data
   - User bỏ qua bước bắt buộc
   - User chọn option không hợp lệ
   - **Action**: Thêm validation + block/warn user trước khi submit
   
   **C. Code Logic Error** (Lỗi logic code)
   - Bug trong code
   - Missing edge case handling
   - Wrong assumptions
   - **Action**: Fix code + add tests

3. **Implement Prevention** (Ngăn chặn lỗi tái diễn)
   
   **Frontend Prevention**:
   - ✅ Validate input trước khi submit
   - ✅ Disable buttons khi thiếu data
   - ✅ Show warning/error messages rõ ràng
   - ✅ Guide user đến đúng action cần làm
   - ✅ Prevent invalid states (disable/hide options)
   
   **Backend Prevention**:
   - ✅ Validate data ở controller layer
   - ✅ Check prerequisites trước khi execute
   - ✅ Return clear error messages (Vietnamese)
   - ✅ Add database constraints
   - ✅ Add migration scripts for missing data
   
   **System Prevention**:
   - ✅ Add setup validation scripts
   - ✅ Create seed scripts for required data
   - ✅ Document setup requirements
   - ✅ Add health check endpoints

4. **Document in LESSONS-LEARNED.md**
   - Write detailed analysis
   - Include prevention steps
   - Add to Key Takeaways if important

---

## ✅ Rule 4: Testing Requirements (MANDATORY)

### Backend Testing

**PHẢI test backend sau khi implement**:
- ✅ Create test script: `backend/scripts/test-{feature-name}.js`
- ✅ Test happy path
- ✅ Test error cases
- ✅ Test edge cases
- ✅ Run test và verify 100% pass
- ✅ Report results trong commit message

**Test Script Template**:
```javascript
// backend/scripts/test-{feature-name}.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFeature() {
  console.log('🧪 Testing {Feature Name}...\n');
  
  try {
    // Test 1: Happy path
    console.log('✅ Test 1: Happy path');
    // ... test code
    
    // Test 2: Error case
    console.log('✅ Test 2: Error handling');
    // ... test code
    
    // Test 3: Edge case
    console.log('✅ Test 3: Edge case');
    // ... test code
    
    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFeature();
```

### Frontend Testing

**Checklist trước khi commit**:
- [ ] No TypeScript errors (`npm run build`)
- [ ] No console errors in browser
- [ ] Test trên Chrome + Firefox
- [ ] Test responsive (mobile, tablet, desktop)
- [ ] Test với real data (không chỉ mock)

---

## 📝 Rule 5: Commit Message Convention

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Add/update tests
- `chore`: Build/config changes

### Examples

**Good**:
```
feat(workflow): Add participant_role field to workflow_steps

- Added participant_role enum (approver/signer)
- Updated workflow creation logic
- Unified ordering system for approvers and signers

Fixes #123
```

**Bad**:
```
update code
```

### Checklist trước khi commit

- [ ] Commit message rõ ràng, có context
- [ ] Đã test code locally
- [ ] Đã update LESSONS-LEARNED.md nếu fix bug
- [ ] Đã organize spec files đúng thư mục
- [ ] No console.log() debug code
- [ ] No commented code (xóa hoặc explain)

---

## 🎯 Rule 6: Code Review Checklist

### Self Review (Trước khi commit)

**Code Quality**:
- [ ] No hardcoded values (use constants/config)
- [ ] No duplicate code (DRY principle)
- [ ] Functions < 50 lines
- [ ] Clear variable/function names
- [ ] Comments cho logic phức tạp

**Error Handling**:
- [ ] Try-catch cho async operations
- [ ] User-friendly error messages (Vietnamese)
- [ ] Log errors với context
- [ ] Return proper HTTP status codes

**Security**:
- [ ] No sensitive data in logs
- [ ] Validate all user inputs
- [ ] Use parameterized queries (Prisma)
- [ ] Check permissions/authorization

**Performance**:
- [ ] No N+1 queries
- [ ] Use indexes cho frequent queries
- [ ] Pagination cho large datasets
- [ ] Optimize images/assets

---

## 📊 Rule 7: Documentation Standards

### README Files

**Mỗi module PHẢI có README với**:
- Purpose/Overview
- API endpoints (nếu có)
- Data models
- Usage examples
- Testing instructions

### Code Comments

**Khi nào cần comment**:
- ✅ Complex business logic
- ✅ Non-obvious algorithms
- ✅ Workarounds/hacks (explain why)
- ✅ TODOs with context

**Khi nào KHÔNG cần comment**:
- ❌ Self-explanatory code
- ❌ Obvious operations
- ❌ Redundant comments

**Good**:
```typescript
// Calculate signing order: workflow steps first, then manual signers
// Workflow steps: 1, 2, 3...
// Manual signers: max(workflow_order) + 1, +2, +3...
const signingOrder = maxWorkflowOrder + manualSignerIndex + 1;
```

**Bad**:
```typescript
// Set signing order
const signingOrder = maxWorkflowOrder + manualSignerIndex + 1;
```

---

## 🚀 Rule 8: Performance Guidelines

### Database

- ✅ Use `select` để chỉ lấy fields cần thiết
- ✅ Use `include` thay vì multiple queries
- ✅ Add indexes cho frequent WHERE clauses
- ✅ Use pagination (skip/take)
- ✅ Avoid SELECT * in production

### Frontend

- ✅ Use React.memo() cho expensive components
- ✅ Debounce search inputs (300ms)
- ✅ Lazy load images
- ✅ Code splitting cho large pages
- ✅ Use React Query cache

### API

- ✅ Return only necessary data (use DTOs)
- ✅ Implement rate limiting
- ✅ Use compression (gzip)
- ✅ Cache static responses
- ✅ Optimize payload size

---

## 🔐 Rule 9: Security Checklist

### Authentication

- [ ] JWT tokens expire (1 hour)
- [ ] Refresh tokens rotate
- [ ] Passwords hashed (bcrypt, 10 rounds)
- [ ] No passwords in logs/errors

### Authorization

- [ ] Check tenant_id in all queries
- [ ] Verify user permissions
- [ ] Validate ownership before update/delete
- [ ] No direct ID access (check permissions)

### Input Validation

- [ ] Validate all inputs (Zod schemas)
- [ ] Sanitize HTML inputs
- [ ] Check file types/sizes
- [ ] Prevent SQL injection (use Prisma)
- [ ] Prevent XSS (escape outputs)

### Data Protection

- [ ] No sensitive data in URLs
- [ ] No sensitive data in logs
- [ ] Encrypt sensitive fields
- [ ] Audit log for critical actions

---

## 📋 Quick Reference

### Before Starting Work
1. Pull latest code: `git pull origin main`
2. Check TODO files: `docs/dev/TODO-*.md`
3. Read related LESSONS-LEARNED entries

### During Development
1. Follow naming conventions
2. Write tests as you code
3. Document complex logic
4. Test frequently

### Before Commit
1. Run tests: `npm test`
2. Check TypeScript: `npm run build`
3. Update LESSONS-LEARNED.md (if bug fix)
4. Organize spec files properly
5. Write clear commit message
6. Self code review

### After Commit
1. Monitor CI/CD pipeline
2. Update related docs
3. Notify team if breaking changes

---

## 🎓 Learning Resources

### Internal Docs
- `docs/dev/LESSONS-LEARNED.md` - Learn from past mistakes
- `docs/dev/ERROR-HANDLING-GUIDE.md` - Error handling patterns
- `docs/dev/UI-TESTING-GUIDE.md` - UI testing strategies

### External Resources
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

## 📞 Questions?

- Check `docs/dev/LESSONS-LEARNED.md` first
- Search existing issues/docs
- Ask in team chat
- Create issue with clear description

---

**Last Updated**: 2025-11-28  
**Version**: 1.0  
**Maintained By**: Development Team
