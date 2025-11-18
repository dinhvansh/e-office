import { sendEmail } from "../../config/email";

export interface OtpEmailData {
  recipientEmail: string;
  recipientName: string;
  otp: string;
  documentTitle?: string;
  expiryMinutes: number;
}

class EmailService {
  async sendOtpEmail(data: OtpEmailData): Promise<void> {
    const html = this.generateOtpEmailHtml(data);
    const text = this.generateOtpEmailText(data);

    await sendEmail({
      to: data.recipientEmail,
      subject: `Mã OTP ký tài liệu - ${data.documentTitle || "WP Sign"}`,
      html,
      text,
    });
  }

  async sendSignRequestNotification(data: {
    recipientEmail: string;
    recipientName: string;
    documentTitle: string;
    senderName: string;
    message?: string;
    signUrl: string;
  }): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Yêu cầu ký tài liệu</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.recipientName}</strong>,</p>
            <p><strong>${data.senderName}</strong> đã gửi cho bạn yêu cầu ký tài liệu:</p>
            <p><strong>Tài liệu:</strong> ${data.documentTitle}</p>
            ${data.message ? `<p><strong>Lời nhắn:</strong> ${data.message}</p>` : ""}
            <p>Vui lòng nhấn vào nút bên dưới để xem và ký tài liệu:</p>
            <a href="${data.signUrl}" class="button">Xem và ký tài liệu</a>
            <p style="color: #666; font-size: 14px;">Hoặc copy link sau vào trình duyệt:<br>${data.signUrl}</p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động từ WP Sign. Vui lòng không trả lời email này.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: data.recipientEmail,
      subject: `Yêu cầu ký tài liệu: ${data.documentTitle}`,
      html,
      text: `Xin chào ${data.recipientName},\n\n${data.senderName} đã gửi cho bạn yêu cầu ký tài liệu: ${data.documentTitle}\n\nVui lòng truy cập: ${data.signUrl}`,
    });
  }

  async sendSignCompletedNotification(data: {
    recipientEmail: string;
    recipientName: string;
    documentTitle: string;
    signerName: string;
  }): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Tài liệu đã được ký</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.recipientName}</strong>,</p>
            <p><strong>${data.signerName}</strong> đã ký thành công tài liệu:</p>
            <p><strong>${data.documentTitle}</strong></p>
            <p>Bạn có thể xem tài liệu đã ký trong hệ thống.</p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động từ WP Sign.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: data.recipientEmail,
      subject: `Tài liệu đã được ký: ${data.documentTitle}`,
      html,
      text: `Xin chào ${data.recipientName},\n\n${data.signerName} đã ký thành công tài liệu: ${data.documentTitle}`,
    });
  }

  private generateOtpEmailHtml(data: OtpEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Mã OTP xác thực</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.recipientName}</strong>,</p>
            <p>Bạn đã yêu cầu ký tài liệu${data.documentTitle ? `: <strong>${data.documentTitle}</strong>` : ""}.</p>
            <p>Vui lòng sử dụng mã OTP bên dưới để xác thực chữ ký của bạn:</p>
            
            <div class="otp-box">
              <div class="otp-code">${data.otp}</div>
            </div>

            <div class="warning">
              <strong>⚠️ Lưu ý:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Mã OTP này có hiệu lực trong <strong>${data.expiryMinutes} phút</strong></li>
                <li>Không chia sẻ mã này với bất kỳ ai</li>
                <li>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động từ WP Sign. Vui lòng không trả lời email này.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateOtpEmailText(data: OtpEmailData): string {
    return `
Xin chào ${data.recipientName},

Bạn đã yêu cầu ký tài liệu${data.documentTitle ? `: ${data.documentTitle}` : ""}.

Mã OTP của bạn là: ${data.otp}

Mã này có hiệu lực trong ${data.expiryMinutes} phút.
Không chia sẻ mã này với bất kỳ ai.

---
Email này được gửi tự động từ WP Sign.
    `.trim();
  }
}

export const emailService = new EmailService();
