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

  async sendApprovalRequestNotification(data: {
    recipientEmail: string;
    recipientName: string;
    documentTitle: string;
    documentNumber?: string;
    submitterName: string;
    workflowName: string;
    stepName: string;
    dueDate?: Date;
    approvalUrl: string;
    comment?: string;
  }): Promise<void> {
    const dueDateStr = data.dueDate 
      ? new Date(data.dueDate).toLocaleDateString('vi-VN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : null;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .urgent { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Yêu cầu phê duyệt</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.recipientName}</strong>,</p>
            <p><strong>${data.submitterName}</strong> đã gửi yêu cầu phê duyệt tài liệu:</p>
            
            <div class="info-box">
              <p><strong>📄 Tài liệu:</strong> ${data.documentTitle}</p>
              ${data.documentNumber ? `<p><strong>📝 Số văn bản:</strong> ${data.documentNumber}</p>` : ''}
              <p><strong>🔄 Quy trình:</strong> ${data.workflowName}</p>
              <p><strong>📍 Bước hiện tại:</strong> ${data.stepName}</p>
              ${dueDateStr ? `<p><strong>⏰ Hạn phê duyệt:</strong> ${dueDateStr}</p>` : ''}
            </div>

            ${data.comment ? `<p><strong>💬 Lời nhắn:</strong> ${data.comment}</p>` : ''}

            ${dueDateStr ? `
              <div class="urgent">
                <strong>⚠️ Lưu ý:</strong> Vui lòng phê duyệt trước ngày ${dueDateStr}
              </div>
            ` : ''}

            <p>Vui lòng nhấn vào nút bên dưới để xem và phê duyệt:</p>
            <a href="${data.approvalUrl}" class="button">Xem và phê duyệt</a>
            <p style="color: #666; font-size: 14px;">Hoặc copy link sau vào trình duyệt:<br>${data.approvalUrl}</p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động từ WP Sign E-Office.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Xin chào ${data.recipientName},

${data.submitterName} đã gửi yêu cầu phê duyệt tài liệu:

Tài liệu: ${data.documentTitle}
${data.documentNumber ? `Số văn bản: ${data.documentNumber}\n` : ''}Quy trình: ${data.workflowName}
Bước hiện tại: ${data.stepName}
${dueDateStr ? `Hạn phê duyệt: ${dueDateStr}\n` : ''}
${data.comment ? `\nLời nhắn: ${data.comment}\n` : ''}
Vui lòng truy cập: ${data.approvalUrl}`;

    await sendEmail({
      to: data.recipientEmail,
      subject: `[Phê duyệt] ${data.documentTitle}`,
      html,
      text,
    });
  }

  async sendApprovalActionNotification(data: {
    recipientEmail: string;
    recipientName: string;
    documentTitle: string;
    documentNumber?: string;
    approverName: string;
    action: 'approved' | 'rejected' | 'request_info';
    comment?: string;
    documentUrl: string;
  }): Promise<void> {
    const actionText = {
      approved: { title: '✅ Đã phê duyệt', color: '#10b981', emoji: '✅' },
      rejected: { title: '❌ Đã từ chối', color: '#ef4444', emoji: '❌' },
      request_info: { title: '❓ Yêu cầu bổ sung', color: '#f59e0b', emoji: '❓' }
    }[data.action];

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${actionText.color} 0%, ${actionText.color}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; border-left: 4px solid ${actionText.color}; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background: ${actionText.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${actionText.emoji} ${actionText.title}</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.recipientName}</strong>,</p>
            <p><strong>${data.approverName}</strong> đã ${data.action === 'approved' ? 'phê duyệt' : data.action === 'rejected' ? 'từ chối' : 'yêu cầu bổ sung thông tin cho'} tài liệu:</p>
            
            <div class="info-box">
              <p><strong>📄 Tài liệu:</strong> ${data.documentTitle}</p>
              ${data.documentNumber ? `<p><strong>📝 Số văn bản:</strong> ${data.documentNumber}</p>` : ''}
              <p><strong>👤 Người phê duyệt:</strong> ${data.approverName}</p>
            </div>

            ${data.comment ? `
              <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p><strong>💬 Nhận xét:</strong></p>
                <p>${data.comment}</p>
              </div>
            ` : ''}

            <p>Vui lòng nhấn vào nút bên dưới để xem chi tiết:</p>
            <a href="${data.documentUrl}" class="button">Xem tài liệu</a>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động từ WP Sign E-Office.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const actionVerb = data.action === 'approved' ? 'phê duyệt' : data.action === 'rejected' ? 'từ chối' : 'yêu cầu bổ sung thông tin cho';
    const text = `Xin chào ${data.recipientName},

${data.approverName} đã ${actionVerb} tài liệu:

Tài liệu: ${data.documentTitle}
${data.documentNumber ? `Số văn bản: ${data.documentNumber}\n` : ''}Người phê duyệt: ${data.approverName}

${data.comment ? `Nhận xét: ${data.comment}\n\n` : ''}Xem chi tiết: ${data.documentUrl}`;

    await sendEmail({
      to: data.recipientEmail,
      subject: `[${actionText.title}] ${data.documentTitle}`,
      html,
      text,
    });
  }

  async sendWorkflowCompletedNotification(data: {
    recipientEmail: string;
    recipientName: string;
    documentTitle: string;
    documentNumber?: string;
    workflowName: string;
    documentUrl: string;
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
          .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Quy trình hoàn tất</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.recipientName}</strong>,</p>
            <p>Tài liệu của bạn đã hoàn tất quy trình phê duyệt:</p>
            
            <div class="success-box">
              <p><strong>📄 Tài liệu:</strong> ${data.documentTitle}</p>
              ${data.documentNumber ? `<p><strong>📝 Số văn bản:</strong> ${data.documentNumber}</p>` : ''}
              <p><strong>🔄 Quy trình:</strong> ${data.workflowName}</p>
              <p><strong>✅ Trạng thái:</strong> Đã phê duyệt hoàn tất</p>
            </div>

            <p>Tài liệu hiện đã có hiệu lực và có thể sử dụng.</p>
            <a href="${data.documentUrl}" class="button">Xem tài liệu</a>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động từ WP Sign E-Office.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Xin chào ${data.recipientName},

Tài liệu của bạn đã hoàn tất quy trình phê duyệt:

Tài liệu: ${data.documentTitle}
${data.documentNumber ? `Số văn bản: ${data.documentNumber}\n` : ''}Quy trình: ${data.workflowName}
Trạng thái: Đã phê duyệt hoàn tất

Xem tài liệu: ${data.documentUrl}`;

    await sendEmail({
      to: data.recipientEmail,
      subject: `[Hoàn tất] ${data.documentTitle}`,
      html,
      text,
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
  /**
   * Send sign request cancellation notification
   */
  async sendSignRequestCancelled(data: {
    to: string;
    signerName: string;
    documentTitle: string;
    cancelledBy: string;
    reason: string;
    signRequestId: number;
  }): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Yêu cầu ký đã bị hủy</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.signerName}</strong>,</p>
            
            <p>Yêu cầu ký tài liệu sau đã bị hủy:</p>
            
            <div class="info-box">
              <p><strong>📄 Tài liệu:</strong> ${data.documentTitle}</p>
              <p><strong>🚫 Hủy bởi:</strong> ${data.cancelledBy}</p>
              <p><strong>📝 Lý do:</strong> ${data.reason}</p>
              <p><strong>🆔 Mã yêu cầu:</strong> #${data.signRequestId}</p>
            </div>
            
            <p>Bạn không cần thực hiện thêm hành động nào cho yêu cầu này.</p>
            
            <p>Nếu có thắc mắc, vui lòng liên hệ với người hủy yêu cầu.</p>
            
            <p>Trân trọng,<br><strong>WP Sign System</strong></p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động từ hệ thống WP Sign</p>
            <p>Vui lòng không trả lời email này</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Yêu cầu ký đã bị hủy

Xin chào ${data.signerName},

Yêu cầu ký tài liệu sau đã bị hủy:

Tài liệu: ${data.documentTitle}
Hủy bởi: ${data.cancelledBy}
Lý do: ${data.reason}
Mã yêu cầu: #${data.signRequestId}

Bạn không cần thực hiện thêm hành động nào cho yêu cầu này.

Trân trọng,
WP Sign System
    `;

    await sendEmail({
      to: data.to,
      subject: `❌ Yêu cầu ký đã bị hủy - ${data.documentTitle}`,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
