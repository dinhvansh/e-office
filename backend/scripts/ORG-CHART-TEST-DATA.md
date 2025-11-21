# Org Chart Test Data

## 🌳 Organizational Structure

```
Công ty ACME (COMPANY)
├── Ban Giám Đốc (BGD)
│   ├── Phòng Nhân Sự (HR)
│   │   ├── Trần Thị Hương (Director)
│   │   └── Nguyễn Thị Mai (Staff)
│   └── Phòng IT (IT)
│       ├── Phạm Minh Tuấn (Director)
│       └── Lê Minh Khoa (Staff)
├── Chi nhánh Hà Nội (HN)
│   ├── Phòng Kinh Doanh HN (SALES-HN)
│   │   ├── Hoàng Văn Nam (Manager)
│   │   └── Đỗ Văn Hùng (Staff)
│   └── Phòng Kỹ Thuật HN (TECH-HN)
│       └── Bùi Văn Toàn (Staff)
└── Chi nhánh TP.HCM (HCM)
    ├── Phòng Kinh Doanh HCM (SALES-HCM)
    │   └── Võ Thị Lan (Manager)
    └── Phòng Kỹ Thuật HCM (TECH-HCM)
```

## 👥 Test Accounts

| Email | Password | Full Name | Position | Department | Role | Manager |
|-------|----------|-----------|----------|------------|------|---------|
| ceo@acme.local | password123 | Nguyễn Văn CEO | CEO | Ban Giám Đốc | Admin | - |
| dir.hr@acme.local | password123 | Trần Thị Hương | Giám Đốc | Phòng Nhân Sự | Manager | CEO |
| dir.it@acme.local | password123 | Phạm Minh Tuấn | Giám Đốc | Phòng IT | Manager | CEO |
| mgr.sales.hn@acme.local | password123 | Hoàng Văn Nam | Giám Đốc | Phòng KD HN | Manager | CEO |
| mgr.sales.hcm@acme.local | password123 | Võ Thị Lan | Giám Đốc | Phòng KD HCM | Manager | CEO |
| staff.hr@acme.local | password123 | Nguyễn Thị Mai | Nhân Viên | Phòng Nhân Sự | User | Dir HR |
| staff.it@acme.local | password123 | Lê Minh Khoa | Nhân Viên | Phòng IT | User | Dir IT |
| staff.sales.hn@acme.local | password123 | Đỗ Văn Hùng | Nhân Viên | Phòng KD HN | User | Mgr Sales HN |
| staff.tech.hn@acme.local | password123 | Bùi Văn Toàn | Nhân Viên | Phòng KT HN | User | Mgr Sales HN |

## 📊 Statistics

- **Tenant**: 1 (Acme Corp)
- **Positions**: 3 (CEO, Giám Đốc, Nhân Viên)
- **Departments**: 10 (3-level hierarchy)
  - Level 1: 1 (Company)
  - Level 2: 3 (BGD, HN, HCM)
  - Level 3: 6 (HR, IT, Sales HN/HCM, Tech HN/HCM)
- **Users**: 9 (with manager hierarchy)
- **Roles**: 3 (Admin, Manager, User)

## 🧪 Test Scenarios

### 1. Org Chart Tree View
- Login as any user
- Navigate to "Phòng ban" page
- See 3-level tree structure
- Click nodes to expand/collapse
- Select department to see details

### 2. User Management
- View users by department
- See position and manager info
- Filter by department in tree

### 3. Manager Hierarchy
- Staff reports to Managers/Directors
- Directors report to CEO
- Test manager-based approvals

### 4. RBAC Testing
- **Admin (CEO)**: Full access to all features
- **Manager (Directors)**: Manage their departments
- **User (Staff)**: Limited access

### 5. Document Permissions
- Create documents with different visibility:
  - **Public**: Everyone can see
  - **Department**: Only same department
  - **Private**: Only owner + admin

## 🚀 Quick Start

### Run Seed
```bash
cd backend
node scripts/seed-org-final.js
```

### Login
http://localhost:3000/login

Use any account from the table above.

## 📝 Notes

- All passwords are: `password123`
- Multi-tenant: All data belongs to "Acme Corp" tenant
- Manager hierarchy is set up correctly
- Department managers are assigned
- Users have positions and departments
