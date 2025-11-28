# 📚 New Documentation System - Hệ thống tài liệu mới

> **Created**: 2025-11-28  
> **Purpose**: Organize documentation và enforce learning from mistakes

---

## 🎯 Tổng quan

Đã tạo hệ thống documentation mới với 3 mục tiêu chính:

1. ✅ **Lessons Learned**: Document tất cả bugs/issues đã fix
2. ✅ **Development Rules**: Quy tắc bắt buộc cho developers
3. ✅ **Organized Structure**: Cấu trúc thư mục rõ ràng, dễ tìm

---

## 📁 Files Created

### Core Files (MANDATORY)

1. **`docs/dev/DEVELOPMENT-RULES.md`** ⭐
   - 9 rules bắt buộc cho developers
   - Covers: Documentation, Testing, Code Review, Security
   - PHẢI đọc trước khi code

2. **`docs/dev/LESSONS-LEARNED.md`** ⭐
   - Document tất cả bugs/issues đã fix
   - 7 lessons hiện tại (Workflow Order, OTP Expiry, etc.)
   - Format chuẩn với Root Cause + Prevention

3. **`docs/dev/INDEX.md`** 📚
   - Navigation cho tất cả docs
   - Organized by category và topic
   - Quick links to important docs

### Supporting Files

4. **`docs/dev/LESSON-TEMPLATE.md`**
   - Template để copy-paste khi document lesson
   - Checklist đầy đủ
   - Tips viết tốt

5. **`docs/NEW-DOCUMENTATION-SYSTEM.md`** (file này)
   - Overview của hệ thống mới
   - Usage guide
   - Examples

---

## 📋 Rules Summary

### Rule 1: Lessons Learned Documentation (MANDATORY)

**Khi nào phải document?**
- ✅ Fix bất kỳ bug/issue nào
- ✅ Giải quyết vấn đề phức tạp (>30 phút debug)
- ✅ Refactor code quan trọng
- ✅ Phát hiện pattern lỗi lặp lại

**Format bắt buộc**:
```markdown
## [YYYY-MM-DD] Tên lỗi

**Loại**: Bug/Issue/Refactor/Performance
**Mức độ**: Critical/High/Medium/Low
**Module**: Module name

### Vấn đề
### Root Cause
### Solution
### Prevention
### Files Changed
### Related Issues
```

### Rule 2: Spec File Organization (MANDATORY)

**Cấu trúc thư mục**:
```
docs/dev/
├── features/          # Feature specs by category
├── sessions/          # Session logs by date
├── issues/            # Issue analysis
├── guides/            # How-to guides
└── reports/           # Reports & summaries
```

**Naming Convention**:
- Features: `FEATURE-{name}.md`
- Sessions: `SESSION-YYYY-MM-DD-{topic}.md`
- Issues: `ISSUE-{name}.md` or `SOLUTION-{name}.md`
- Guides: `{TYPE}-GUIDE.md`

### Rule 3-9: Other Rules

- Rule 3: Root Cause Analysis
- Rule 4: Testing Requirements
- Rule 5: Commit Message Convention
- Rule 6: Code Review Checklist
- Rule 7: Documentation Standards
- Rule 8: Performance Guidelines
- Rule 9: Security Checklist

**See `docs/dev/DEVELOPMENT-RULES.md` for details**

---

## 🚀 Usage Guide

### Workflow khi fix bug

1. **Debug & Fix**
   ```bash
   # Fix the bug
   git add .
   ```

2. **Document Lesson Learned**
   ```bash
   # Open LESSONS-LEARNED.md
   # Copy template from LESSON-TEMPLATE.md
   # Fill in all sections
   ```

3. **Commit**
   ```bash
   git commit -m "fix(module): Brief description

   - Fixed issue X
   - Root cause: Y
   - Prevention: Z
   
   Documented in LESSONS-LEARNED.md"
   ```

### Workflow khi tạo feature spec

1. **Determine Category**
   - Workflow? → `docs/dev/features/workflow/`
   - Document? → `docs/dev/features/documents/`
   - Signing? → `docs/dev/features/signing/`

2. **Create File**
   ```bash
   # Use naming convention
   docs/dev/features/workflow/FEATURE-NEW-FEATURE.md
   ```

3. **Add to INDEX.md**
   ```markdown
   ### Workflow System
   - [FEATURE-NEW-FEATURE.md](features/workflow/FEATURE-NEW-FEATURE.md)
   ```

### Workflow khi viết session log

1. **Create File**
   ```bash
   docs/dev/sessions/2025-11/SESSION-2025-11-28-TOPIC.md
   ```

2. **Document Session**
   - What was done
   - Issues encountered
   - Solutions applied
   - Time spent

3. **Link Related Docs**
   - Link to feature specs
   - Link to lessons learned
   - Link to issues

---

## 📊 Current Status

### Lessons Learned
- **Total**: 7 lessons documented
- **Critical**: 1 (Field Position)
- **High**: 4 (Workflow Order, OTP Expiry, etc.)
- **Medium**: 2 (Dropdown Overflow, etc.)

### Documentation Structure
- ✅ Core rules created
- ✅ Template created
- ✅ Index created
- 🔜 Need to organize existing docs into folders

### Next Steps
1. Migrate old session logs to `sessions/` folder
2. Create feature category folders
3. Move existing feature specs to proper folders
4. Update all cross-references

---

## 💡 Examples

### Example 1: Document Bug Fix

**Scenario**: Fixed OTP expiry error handling

**Steps**:
1. Open `docs/dev/LESSONS-LEARNED.md`
2. Copy template from `docs/dev/LESSON-TEMPLATE.md`
3. Fill in:
   ```markdown
   ## [2025-11-27] OTP Expiry - Poor Error Handling
   
   **Loại**: Bug - UX Issue
   **Mức độ**: Medium
   **Module**: Public Signing
   
   ### Vấn đề
   - OTP hết hạn sau 10 phút
   - User nhập OTP cũ → Generic error
   
   ### Root Cause
   - Backend không check otp_expire timestamp
   - Error message không specific
   
   ### Solution
   1. Check expiry TRƯỚC khi check hash
   2. Return specific error message
   3. Add "Gửi lại OTP" button
   
   ### Prevention
   - ✅ Luôn check expiry/validity trước value
   - ✅ Error messages phải specific
   - ✅ Provide clear next steps
   ```

### Example 2: Create Feature Spec

**Scenario**: Planning new approval history feature

**Steps**:
1. Create file: `docs/dev/features/workflow/FEATURE-APPROVAL-HISTORY.md`
2. Write spec with sections:
   - Overview
   - Requirements
   - API Design
   - UI Design
   - Implementation Plan
3. Add to INDEX.md under "Workflow System"

### Example 3: Session Log

**Scenario**: Completed workflow refactor session

**Steps**:
1. Create: `docs/dev/sessions/2025-11/SESSION-2025-11-27-WORKFLOW-REFACTOR.md`
2. Document:
   - Duration: 2 hours
   - Features: Added participant_role field
   - Issues: Signing order conflicts
   - Solution: Unified ordering system
   - Files changed: 15 files
3. Link to:
   - `ISSUE-WORKFLOW-ORDER.md`
   - `SOLUTION-WORKFLOW-PARTICIPANT-ROLE.md`
   - `LESSONS-LEARNED.md` entry

---

## 🎯 Benefits

### For Developers
- ✅ Learn from past mistakes
- ✅ Avoid repeating same bugs
- ✅ Clear guidelines to follow
- ✅ Easy to find relevant docs

### For Team
- ✅ Knowledge sharing
- ✅ Consistent code quality
- ✅ Faster onboarding
- ✅ Better collaboration

### For Project
- ✅ Reduced bugs
- ✅ Better documentation
- ✅ Easier maintenance
- ✅ Higher quality code

---

## 📞 Questions?

### Where to start?
1. Read `docs/dev/DEVELOPMENT-RULES.md`
2. Read `docs/dev/LESSONS-LEARNED.md`
3. Browse `docs/dev/INDEX.md`

### How to contribute?
1. Follow the rules in DEVELOPMENT-RULES.md
2. Document lessons learned after fixing bugs
3. Keep specs organized in proper folders
4. Update INDEX.md when adding new docs

### Need help?
- Check INDEX.md for relevant docs
- Search LESSONS-LEARNED.md for similar issues
- Ask in team chat

---

## 🔄 Migration Plan

### Phase 1: Core Setup ✅ (DONE)
- ✅ Create DEVELOPMENT-RULES.md
- ✅ Create LESSONS-LEARNED.md
- ✅ Create INDEX.md
- ✅ Create LESSON-TEMPLATE.md
- ✅ Update README.md

### Phase 2: Organization 🔜 (TODO)
- [ ] Create folder structure
- [ ] Move existing docs to proper folders
- [ ] Update all cross-references
- [ ] Archive old/deprecated docs

### Phase 3: Adoption 🔜 (TODO)
- [ ] Team training on new system
- [ ] Enforce rules in code reviews
- [ ] Regular updates to LESSONS-LEARNED.md
- [ ] Monthly review of documentation

---

## 📈 Success Metrics

### Documentation Quality
- Number of lessons documented
- Coverage of critical bugs
- Completeness of prevention steps

### Developer Adoption
- % of bugs with lessons documented
- % of specs in proper folders
- % of commits following convention

### Impact
- Reduction in repeated bugs
- Faster bug resolution time
- Improved code quality scores

---

**Last Updated**: 2025-11-28  
**Status**: Phase 1 Complete ✅  
**Next**: Phase 2 - Organization
