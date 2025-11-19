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
