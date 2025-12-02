// Email template base with professional design
// Primary color: #2563EB (blue-600)

export const getEmailBase = (content: string) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WP Sign E-Office</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6; 
      color: #1f2937;
      background-color: #f3f4f6;
      padding: 20px;
    }
    .email-wrapper { 
      max-width: 600px; 
      margin: 0 auto; 
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: #2563EB;
      color: white; 
      padding: 32px 24px;
      text-align: center;
    }
    .logo { 
      width: 48px; 
      height: 48px; 
      margin: 0 auto 16px;
      background: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .header h1 { 
      font-size: 24px; 
      font-weight: 600;
      margin: 0;
    }
    .content { 
      padding: 32px 24px;
    }
    .content p { 
      margin-bottom: 16px;
      color: #374151;
    }
    .info-box { 
      background: #eff6ff;
      border-left: 4px solid #2563EB;
      padding: 16px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .info-box p { 
      margin: 8px 0;
      font-size: 14px;
    }
    .button { 
      display: inline-block;
      background: #2563EB;
      color: white !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
      text-align: center;
    }
    .button:hover { 
      background: #1d4ed8;
    }
    .otp-box { 
      background: white;
      border: 2px dashed #2563EB;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
      border-radius: 8px;
    }
    .otp-code { 
      font-size: 36px;
      font-weight: bold;
      color: #2563EB;
      letter-spacing: 10px;
      font-family: 'Courier New', monospace;
    }
    .warning-box { 
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .success-box { 
      background: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 16px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .danger-box { 
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .footer { 
      background: #f9fafb;
      padding: 24px;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
      border-top: 1px solid #e5e7eb;
    }
    .footer p { 
      margin: 4px 0;
    }
    .link-text { 
      color: #2563EB;
      word-break: break-all;
      font-size: 13px;
    }
    strong { 
      color: #111827;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="logo">📄</div>
      ${content}
    </div>
  </div>
</body>
</html>
`;

export const getOtpEmailTemplate = (data: {
  recipientName: string;
  otp: string;
  documentTitle?: string;
  expiryMinutes: number;
}) => getEmailBase(`
  <h1>🔐 Mã OTP Xác Thực</h1>
</div>
<div class="content">
  <p>Xin chào <strong>${data.recipientName}</strong>,</p>
  <p>Bạn đã yêu cầu ký tài liệu${data.documentTitle ? `: <strong>${data.documentTitle}</strong>` : ''}.</p>
  <p>Vui lòng sử dụng mã OTP bên dưới để xác thực chữ ký:</p>
  
  <div class="otp-box">
    <div class="otp-code">${data.otp}</div>
  </div>

  <div class="warning-box">
    <p><strong>⚠️ Lưu ý quan trọng:</strong></p>
    <ul style="margin: 12px 0 0 20px; padding: 0;">
      <li>Mã OTP có hiệu lực trong <strong>${data.expiryMinutes} phút</strong></li>
      <li>Không chia sẻ mã này với bất kỳ ai</li>
      <li>Nếu không yêu cầu, vui lòng bỏ qua email này</li>
    </ul>
  </div>
</div>
<div class="footer">
  <p><strong>WP Sign E-Office</strong></p>
  <p>Email tự động - Vui lòng không trả lời</p>
</div>
`);
