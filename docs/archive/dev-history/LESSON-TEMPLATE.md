# Lesson Learned Template

> Copy template này vào `LESSONS-LEARNED.md` khi fix bug/issue

---

## [YYYY-MM-DD] Tên lỗi ngắn gọn

**Loại**: Bug/Issue/Refactor/Performance  
**Mức độ**: Critical/High/Medium/Low  
**Module**: Tên module bị ảnh hưởng

### Vấn đề
Mô tả chi tiết vấn đề gặp phải:
- Triệu chứng gì?
- Khi nào xảy ra?
- Ảnh hưởng đến ai/cái gì?

### Root Cause
Nguyên nhân gốc rễ của vấn đề:
- TẠI SAO lỗi xảy ra?
- Code/logic nào gây ra?
- Assumption nào sai?

### Solution
Cách fix đã áp dụng:
1. Bước 1: ...
2. Bước 2: ...
3. Bước 3: ...

**Code Example** (nếu có):
```typescript
// ❌ BEFORE (Wrong)
const badCode = ...;

// ✅ AFTER (Correct)
const goodCode = ...;
```

### Prevention
Cách ngăn chặn lỗi tương tự trong tương lai:

**Frontend**:
- ✅ Action 1
- ✅ Action 2

**Backend**:
- ✅ Action 1
- ✅ Action 2

**System**:
- ✅ Action 1
- ✅ Action 2

### Files Changed
- `path/to/file1.ts` - Description of change
- `path/to/file2.tsx` - Description of change
- `path/to/file3.js` - Description of change

### Related Issues
- Link to GitHub issue: #123
- Link to PR: #456
- Related doc: `docs/dev/ISSUE-*.md`

### Test Results
```
✅ Test 1: Description - PASSED
✅ Test 2: Description - PASSED
✅ Test 3: Description - PASSED
```

---

## Checklist

Sau khi document lesson learned:

- [ ] Đã copy template vào `LESSONS-LEARNED.md`
- [ ] Đã điền đầy đủ tất cả sections
- [ ] Đã thêm code examples (nếu có)
- [ ] Đã update Statistics ở cuối file
- [ ] Đã thêm vào Key Takeaways (nếu quan trọng)
- [ ] Đã link đến related docs
- [ ] Đã commit với message rõ ràng

---

## Tips

### Viết Root Cause tốt
- ❌ Bad: "Code bị lỗi"
- ✅ Good: "Dùng pixel thay vì percentage cho position, không responsive"

### Viết Prevention tốt
- ❌ Bad: "Cẩn thận hơn"
- ✅ Good: "Luôn dùng relative units (%, rem) cho position/size"

### Viết Solution tốt
- ❌ Bad: "Fix code"
- ✅ Good: "Convert pixel → percentage khi save, percentage → pixel khi render"

---

**Remember**: Mục đích là giúp team TRÁNH lặp lại lỗi, không phải chỉ document!
