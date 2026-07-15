import { PolicyPage } from '@/components/legal/policy-page';
import { policyMetadata } from '@/lib/policy-metadata';

export default function TermsPage() {
  return <PolicyPage title="Điều khoản sử dụng" version={policyMetadata.termsVersion} sections={[
    { heading: 'Phạm vi bản dự thảo', content: 'Tài liệu này mô tả định hướng sử dụng E-Office trong giai đoạn public beta. Đây chưa phải là cam kết hoặc tư vấn pháp lý.' },
    { heading: 'Sử dụng tài khoản', content: 'Người dùng chịu trách nhiệm bảo vệ thông tin đăng nhập, sử dụng workspace được cấp quyền và báo cho quản trị viên khi phát hiện hoạt động bất thường.' },
    { heading: 'Nội dung và workflow', content: 'Người dùng chỉ tải lên, chia sẻ và xử lý tài liệu khi có quyền phù hợp. Quy tắc lưu giữ, phê duyệt và ký phải do tổ chức của bạn xác định.' },
    { heading: 'Thay đổi dịch vụ', content: 'Trong public beta, chức năng và tài liệu có thể thay đổi. Các thay đổi quan trọng sẽ được cập nhật bằng phiên bản và ngày hiệu lực mới.' },
  ]} />;
}
