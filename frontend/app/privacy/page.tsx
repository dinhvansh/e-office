import { PolicyPage } from '@/components/legal/policy-page';
import { policyMetadata } from '@/lib/policy-metadata';

export default function PrivacyPage() {
  return <PolicyPage title="Chính sách bảo mật" version={policyMetadata.privacyVersion} sections={[
    { heading: 'Phạm vi bản dự thảo', content: 'Tài liệu này là bản dự thảo cho public beta và đang chờ rà soát pháp lý. Không thay thế chính sách dữ liệu chính thức của tổ chức triển khai.' },
    { heading: 'Dữ liệu được xử lý', content: 'Dịch vụ có thể xử lý thông tin tài khoản, thông tin workspace, tài liệu và dữ liệu workflow mà người dùng hoặc quản trị viên cung cấp.' },
    { heading: 'Mục đích sử dụng', content: 'Dữ liệu được dùng để vận hành workspace, xác thực người dùng, thực hiện workflow và hỗ trợ sự cố theo cấu hình của tổ chức.' },
    { heading: 'Kiểm soát và hỗ trợ', content: 'Quản trị viên workspace quản lý quyền truy cập. Hãy liên hệ quản trị viên hoặc bộ phận hỗ trợ để yêu cầu làm rõ về dữ liệu trong môi trường của bạn.' },
  ]} />;
}
