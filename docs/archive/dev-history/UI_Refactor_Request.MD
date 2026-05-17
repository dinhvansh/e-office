# UI Refactor Request

## 1. Mục Tiêu Dự Án (Project Goal)

Thực hiện **cập nhật và làm mới toàn bộ giao diện người dùng (UI) và trải nghiệm người dùng (UX)** cho hệ thống quản lý tài liệu và ký kết điện tử **Acme Corp Enterprise**.

Mục tiêu:

- Chuyển đổi giao diện hiện tại sang thiết kế **hiện đại, trực quan, thân thiện với người dùng**.
- Tuân thủ nguyên tắc **Flat Design**.
- **Tối ưu Responsive** trên mọi thiết bị (mobile, tablet, desktop).

---

## 2. Công Nghệ & Phạm Vi (Stack & Scope)

### Technology Stack

- **Next.js**
- **React**
- **Tailwind CSS**

### Phạm Vi Công Việc

> **CHỈ GIỚI HẠN Ở FRONT-END**

Bao gồm:

- Các file **component** React.
- Các **hooks** liên quan đến UI.
- Toàn bộ phần **styling Tailwind CSS**.

---

## 3. Yêu Cầu Nghiêm Ngặt (Non-Negotiable Constraints)

TUYỆT ĐỐI **KHÔNG** được gây ảnh hưởng tới các phần sau:

### 3.1. API & Backend

- **Endpoints**: Giữ nguyên **tất cả URL API** và **HTTP method** (`GET`, `POST`, `PUT`, `DELETE`).
- **Data Contract**:  
  - Không thay đổi **cấu trúc JSON** của **request payload**.
  - Không thay đổi **cấu trúc JSON** của **response body**.

### 3.2. Logic Nghiệp Vụ Frontend

- **Data Fetching Logic**  
  - Giữ nguyên **function signature** và **logic cốt lõi** của các custom hooks  
    (ví dụ: `useProcesses`, `useUsers`, …).
- **Global State**  
  - Không thay đổi cách thức và cấu trúc **quản lý state toàn cục**  
    (Redux, Context, Zustand, v.v. nếu có).
- **Routing**  
  - Giữ nguyên **tất cả đường dẫn URL hiện tại**, ví dụ:
    - `/dashboard`
    - `/signing-processes`
    - `/admin/users`
    - …

---

## 4. Chi Tiết Thay Đổi Giao Diện (Design Specifications)

### 4.1. Thiết Kế Hệ Thống (Design System)

| Thành phần          | Quy tắc Tailwind CSS                                        | Ghi chú                               |
|---------------------|-------------------------------------------------------------|---------------------------------------|
| Primary Color       | `bg-blue-600`, `text-blue-600`                              | Dùng cho nút chính, icon chủ đạo      |
| Secondary Color     | `bg-gray-50`, `text-gray-700`                               | Nền phụ, chữ thông thường             |
| Success Status      | `bg-green-100`, `text-green-700`                            | Tag trạng thái **Hoàn thành**         |
| Pending/Warning     | `bg-amber-100`, `text-amber-700`                            | Tag trạng thái **Chờ ký**             |
| Danger Status       | `bg-red-100`, `text-red-700`                                | Tag trạng thái **Từ chối / Hủy**      |
| Font                | `font-sans`                                                 | Font hiện đại mặc định                |

---

### 4.2. Cấu Trúc Component Chính

#### A. Thanh Điều Hướng (Sidebar)

- Tái cấu trúc thành component riêng: **`<Sidebar />`**
- Styling:
  - `bg-white`
  - `border-r`
- Nội dung:
  - Mỗi mục menu hiển thị theo cấu trúc: **Icon + Tên mục**
  - Ví dụ: `📊 Dashboard`, `📄 Quy trình ký`, `👥 Người dùng`

#### B. Màn Hình Tổng Quan (`/dashboard`)

- Component chính:
  - `<MetricCard />`  
    - Dùng cho **4 chỉ số thống kê** chính.  
    - Style: `shadow`, `rounded`, `p-6` (hoặc tương đương).
- Biểu đồ:
  - Dành không gian cho **2 biểu đồ** (ví dụ: biểu đồ tiến độ & biểu đồ phân loại trạng thái).

#### C. Bảng Quy Trình Ký (`/signing-processes`)

- **Nút hành động chính**:
  - Nút **"Tạo Quy Trình Mới"** nổi bật nhất.
  - Style: `bg-blue-600`, `text-white`, `hover:bg-blue-700`.

- **Component đề xuất**:
  - `<FilterTabs />`
    - Tabs ngang để lọc nhanh:
      - `Tất cả`
      - `Chờ của tôi`
      - `Đã hoàn tất`
  - `<DataTable />`
    - Bảng dữ liệu sử dụng Tailwind:
      - `border-collapse`
      - `hover:bg-gray-50` cho từng hàng.
  - `<StatusTag status={value} />`
    - Hiển thị trạng thái với màu tương ứng (Success/Pending/Danger).
  - Dropdown hành động:
    - Thay các nút/link rời rạc bằng **menu 3 chấm** (kebab menu).
    - Ví dụ: `<ProcessActionsDropdown processId={id} />`.

---

### 4.3. Yêu Cầu Responsive (Thích Ứng Đa Thiết Bị)

Áp dụng nguyên tắc **Mobile-First** (sử dụng class Tailwind: `sm:`, `md:`, `lg:`, …).

#### A. Layout Chung (Sidebar & Navigation)


Để cấu trúc lại Sidebar cho hệ thống Acme Corp (hệ thống Enterprise/SaaS) một cách chuyên nghiệp, mình đề xuất chia Sidebar thành 3 Nhóm (Sections) chính.

Cách chia này giúp tách biệt giữa: Công việc hàng ngày (người dùng thường) vs Quản trị nhân sự (Admin/HR) vs Cấu hình kỹ thuật (IT/Super Admin).

Dưới đây là đề xuất cấu trúc chi tiết và cách triển khai trong code (Next.js/React):

📐 Cấu trúc Phân cấp (Hierarchy Proposal)
1. 🚀 SECTION 1: WORKSPACE (Không gian làm việc)
Dành cho mọi user, nơi diễn ra các hoạt động chính hàng ngày.

Dashboard (Tổng quan): Xem báo cáo, số liệu.

Quy trình ký (Signing): Tạo mới, chờ ký, lịch sử ký.

Kho tài liệu (Documents): Upload, quản lý file gốc.

2. 👥 SECTION 2: ORGANIZATION (Tổ chức & Nhân sự)
Dành cho Admin/Quản lý để setup cơ cấu công ty.

Nhân sự (Users): Quản lý danh sách user.

Phòng ban (Departments): Cây sơ đồ tổ chức.

Vai trò & Quyền (Roles): Phân quyền ai làm gì.

3. ⚙️ SECTION 3: SETTINGS (Cấu hình & Hệ thống)
Các cài đặt ít dùng hơn, thiên về kỹ thuật và setup hệ thống.

Loại văn bản (Doc Types): Định nghĩa các loại hợp đồng.

Doanh nghiệp (Company): Branding, domain.

Gói dịch vụ (Billing): License, thanh toán.

Webhooks/API: Tích hợp hệ thống ngoài.

💻 Triển khai Code (Data Structure)
Thay vì hard-code từng dòng JSX, bạn nên dùng một mảng dữ liệu (Array of Objects). Cách này code cực gọn, dễ bảo trì và dễ làm active state.

JavaScript

// constants/sidebarItems.js
import { 
  LayoutDashboard, FileText, PenTool, 
  Users, Building2, ShieldCheck, 
  Settings, Tag, Box, CreditCard 
} from 'lucide-react'; // Hoặc thư viện icon bạn đang dùng

export const SIDEBAR_STRUCTURE = [
  {
    groupLabel: "Workspace",
    items: [
      { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
      { label: "Quy trình ký", href: "/signing", icon: PenTool },
      { label: "Tài liệu", href: "/documents", icon: FileText },
    ]
  },
  {
    groupLabel: "Tổ chức",
    items: [
      { label: "Người dùng", href: "/admin/users", icon: Users },
      { label: "Phòng ban", href: "/admin/departments", icon: Building2 },
      { label: "Vai trò & Quyền", href: "/admin/roles", icon: ShieldCheck },
    ]
  },
  {
    groupLabel: "Cấu hình",
    items: [
      { label: "Loại văn bản", href: "/settings/doc-types", icon: Tag },
      { label: "Doanh nghiệp", href: "/settings/company", icon: Settings },
      { label: "Gói dịch vụ", href: "/settings/billing", icon: CreditCard },
      { label: "Webhooks", href: "/settings/webhooks", icon: Box }, // Icon Box hoặc Network
    ]
  }
];
🎨 Giao Diện Component (Tailwind)
Đây là cách render cái mảng trên ra giao diện đẹp, có tiêu đề nhóm nhỏ (Group Label) để phân cách.

TypeScript

// components/Sidebar.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SIDEBAR_STRUCTURE } from '@/constants/sidebarItems';

const Sidebar = () => {
  const pathname = usePathname(); // Để check active link

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed overflow-y-auto">
      
      {/* 1. Header / Logo */}
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-blue-600">Acme Corp</h1>
        <p className="text-xs text-gray-400">Enterprise Edition</p>
      </div>

      {/* 2. Menu List */}
      <div className="flex-1 py-4 space-y-6 px-3">
        {SIDEBAR_STRUCTURE.map((group, index) => (
          <div key={index}>
            {/* Group Label (chữ nhỏ màu xám) */}
            <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {group.groupLabel}
            </h3>

            {/* Items trong group */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href; // Logic active đơn giản
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-600' // Active State
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900' // Normal State
                      }
                    `}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. User Profile (Footer) */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
             AD
           </div>
           <div>
             <p className="text-sm font-medium text-gray-700">Admin User</p>
             <p className="text-xs text-gray-500">admin@acme.com</p>
           </div>
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;
✨ Điểm nhấn của cấu trúc này:
Visual Hierarchy (Phân cấp thị giác): Các groupLabel (Workspace, Tổ chức...) giúp mắt người dùng quét nhanh, không bị rối như danh sách dài ngoằng cũ.

UX Active State: Dùng bg-blue-50 và text-blue-600 cho mục đang chọn giúp người dùng biết mình đang ở đâu.

Khoảng trắng (Spacing): space-y-6 giữa các group tạo cảm giác thoáng đãng, hiện đại.

Dễ mở rộng: Sau này có thêm mục mới (ví dụ: "Báo cáo Audit"), bạn chỉ cần thêm 1 dòng vào file config mảng, UI tự update.



Tính năng thu gọn (Collapse/Expand) là tiêu chuẩn bắt buộc cho các hệ thống Enterprise, vì bảng dữ liệu (Data Table) thường có rất nhiều cột, cần càng nhiều không gian chiều ngang càng tốt.

Để làm tính năng này mượt mà trên Next.js + Tailwind, mình sẽ nâng cấp code Sidebar ở trên một chút:

💡 Cơ chế hoạt động
Trạng thái: Dùng useState để lưu isCollapsed (true/false).

Chiều rộng:

Mở: w-64 (256px).

Thu gọn: w-20 (80px) -> Chỉ đủ hiển thị Icon và căn giữa nó.

Nhãn (Text): Ẩn đi khi thu gọn.

Group Label: Khi thu gọn, thay vì hiện chữ "WORKSPACE", ta chỉ hiện dấu gạch ngang (-) hoặc ẩn luôn để đỡ rối.

Toggle Button: Nút bấm mũi tên << hoặc >> để chuyển trạng thái.

💻 Code Cập Nhật (Có tính năng thu gọn)
Bạn cập nhật file components/Sidebar.tsx như sau:

TypeScript

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SIDEBAR_STRUCTURE } from '@/constants/sidebarItems';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Icon mũi tên

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false); // State quản lý đóng/mở
  const pathname = usePathname();

  return (
    <aside 
      className={`
        h-screen bg-white border-r border-gray-200 flex flex-col fixed transition-all duration-300 ease-in-out z-50
        ${isCollapsed ? 'w-20' : 'w-64'} 
      `}
    >
      
      {/* 1. Header / Logo */}
      <div className={`h-16 flex items-center border-b border-gray-100 ${isCollapsed ? 'justify-center' : 'px-6'}`}>
        {isCollapsed ? (
           // Logo nhỏ khi thu gọn
           <span className="text-xl font-bold text-blue-600">A</span>
        ) : (
           // Logo đầy đủ
           <div>
             <h1 className="text-2xl font-bold text-blue-600">Acme Corp</h1>
             <p className="text-xs text-gray-400">Enterprise Edition</p>
           </div>
        )}
      </div>

      {/* 2. Menu List */}
      <div className="flex-1 py-4 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {SIDEBAR_STRUCTURE.map((group, index) => (
          <div key={index}>
            {/* Group Label Logic: Ẩn hoặc hiện dấu gạch khi thu gọn */}
            {!isCollapsed ? (
               <h3 className="px-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider animate-fadeIn">
                 {group.groupLabel}
               </h3>
            ) : (
               <div className="h-px bg-gray-100 mx-4 mb-4 mt-2" /> // Dấu gạch ngang phân cách
            )}

            <div className="space-y-1 px-3">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    title={isCollapsed ? item.label : ""} // Tooltip cơ bản
                    className={`
                      flex items-center rounded-lg transition-all duration-200 group relative
                      ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2'}
                      ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                    `}
                  >
                    <item.icon className={`
                       transition-all duration-200
                       ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}
                       ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                    `} />
                    
                    {/* Text Label: Ẩn khi thu gọn */}
                    {!isCollapsed && (
                      <span className="text-sm font-medium whitespace-nowrap animate-fadeIn">
                        {item.label}
                      </span>
                    )}

                    {/* Tooltip nâng cao (Optional): Hiện ra bên cạnh khi hover ở chế độ thu gọn */}
                    {isCollapsed && (
                      <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                        {item.label}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Toggle Button (Nút thu gọn) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 text-gray-500 z-50 hidden md:block"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* 4. Footer User */}
      <div className={`p-4 border-t border-gray-100 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {isCollapsed ? (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs cursor-pointer">
             AD
           </div>
        ) : (
          <div className="flex items-center gap-3 animate-fadeIn">
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
               AD
             </div>
             <div className="overflow-hidden">
               <p className="text-sm font-medium text-gray-700 truncate">Admin User</p>
               <p className="text-xs text-gray-500 truncate">admin@acme.com</p>
             </div>
          </div>
        )}
      </div>

    </aside>
  );
};

export default Sidebar;
✨ Điểm cần lưu ý về UX khi thu gọn:
Transition: Class transition-all duration-300 ở thẻ aside là rất quan trọng. Nó giúp Sidebar trượt ra/vào mượt mà thay vì giật cục.

Main Content Layout: Ở file Layout chính (nơi chứa Sidebar), bạn phải điều chỉnh margin-left của phần nội dung chính dựa theo state isCollapsed.

Nếu Sidebar mở: Content ml-64.

Nếu Sidebar đóng: Content ml-20.

(Có thể dùng Context API để truyền state này ra ngoài Layout cha).

Tooltip: Khi thu gọn, người dùng không thấy chữ nữa, nên bắt buộc phải có Tooltip khi di chuột vào Icon (mình đã thêm đoạn code absolute left-14... trong ví dụ trên để minh họa).