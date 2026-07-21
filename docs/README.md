# Documentation Index

Thư mục này chứa tài liệu chính và tài liệu tham khảo cho phát triển, triển khai, kiểm thử.

## Tài liệu chính

- [../README.md](../README.md): tổng quan repo và cách chạy nhanh
- [../START-HERE-E-OFFICE.md](../START-HERE-E-OFFICE.md): điểm vào ngắn nhất cho dev mới
- [../FUNCTIONAL_SPEC.md](../FUNCTIONAL_SPEC.md): mô tả chức năng và flow nghiệp vụ hiện tại
- [business-flows.md](business-flows.md): sơ đồ nghiệp vụ cho dev và cho người dùng/nghiệp vụ
- [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md): deploy bằng Docker và VPS
- [testing-guide.md](testing-guide.md): cách build, smoke test, kiểm tra các flow chính
- [email-setup.md](email-setup.md): cấu hình SMTP

## Tài liệu tham khảo

- `dev/`: ghi chú kỹ thuật, phân tích, log sửa lỗi, đề xuất nội bộ
- `setup/`, `setup-and-backup/`, `docker/`, `specs/`: tài liệu tham khảo theo giai đoạn cũ

## Quy ước dùng tài liệu

- Nếu tài liệu cũ mâu thuẫn với code hiện tại, ưu tiên:
  - source code
  - file env example
  - `README.md`
  - bộ docs chính ở trên

## Mục tiêu của bộ docs hiện tại

- giúp người mới clone repo có thể chạy được
- giải thích đúng flow `draft -> approval/signing`
- giảm phụ thuộc vào tài liệu phiên làm việc cũ
