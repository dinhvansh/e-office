# Email Configuration Guide

## Overview
WP Sign sử dụng email để gửi:
- Mã OTP cho người ký
- Thông báo yêu cầu ký tài liệu
- Thông báo hoàn thành ký

## Configuration

### 1. Environment Variables

Thêm các biến sau vào file `.env` của backend:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@wpsign.local
EMAIL_FROM_NAME=WP Sign
```

### 2. Email Providers

#### Gmail
1. Bật 2-Step Verification: https://myaccount.google.com/security
2. Tạo App Password: https://myaccount.google.com/apppasswords
3. Sử dụng App Password làm `SMTP_PASSWORD`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
```

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
```

### 3. Development Mode

Nếu không cấu hình SMTP trong development, email sẽ được log ra console thay vì gửi thực:

```bash
# Không set SMTP_USER để enable console logging
SMTP_USER=
```

Console output sẽ hiển thị:
```
📧 [EMAIL] Would send email: {
  from: 'WP Sign <noreply@wpsign.local>',
  to: 'user@example.com',
  subject: 'Mã OTP ký tài liệu',
  html: '...'
}
```

### 4. Testing Email

Sau khi cấu hình, test bằng cách:

1. Tạo sign request
2. Gửi OTP cho signer
3. Kiểm tra email inbox

```bash
# Test API endpoint
curl -X POST http://localhost:4000/api/v1/signers/1/send-otp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Email Templates

### OTP Email
- Subject: `Mã OTP ký tài liệu - [Document Title]`
- Chứa mã OTP 6 số
- Hiển thị thời gian hết hạn (10 phút)
- Cảnh báo bảo mật

### Sign Request Notification
- Subject: `Yêu cầu ký tài liệu: [Document Title]`
- Thông tin người gửi
- Link đến trang ký
- Lời nhắn (nếu có)

### Sign Completed Notification
- Subject: `Tài liệu đã được ký: [Document Title]`
- Thông tin người ký
- Trạng thái hoàn thành

## Troubleshooting

### Gmail "Less secure app access"
Gmail đã tắt tính năng này. Bạn PHẢI sử dụng App Password.

### Port 587 vs 465
- Port 587: STARTTLS (recommended) - set `SMTP_SECURE=false`
- Port 465: SSL/TLS - set `SMTP_SECURE=true`

### Email không gửi được
1. Kiểm tra credentials
2. Kiểm tra firewall/network
3. Xem logs trong console
4. Test với service khác (Gmail → SendGrid)

### Rate Limiting
- Gmail: 500 emails/day (free), 2000/day (Google Workspace)
- SendGrid: 100 emails/day (free)
- AWS SES: 200 emails/day (sandbox), unlimited (production)

## Production Recommendations

1. **Sử dụng dedicated email service**: SendGrid, AWS SES, Mailgun
2. **Setup SPF/DKIM/DMARC** để tránh spam
3. **Monitor email delivery rate**
4. **Implement retry mechanism** cho failed emails
5. **Use email queue** (BullMQ) cho high volume

## Next Steps

- [ ] Implement SMS OTP (Twilio, AWS SNS)
- [ ] Add email templates customization
- [ ] Add email delivery tracking
- [ ] Implement email queue with retry
- [ ] Add unsubscribe functionality
