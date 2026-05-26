import { sendEmail } from "../../config/email";
import { getOtpEmailTemplate } from "./email-templates";

export interface OtpEmailData {
  tenantId?: number;
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
      tenantId: data.tenantId,
      to: data.recipientEmail,
      subject: `Mã OTP ký tài liệu - ${data.documentTitle || "WP Sign"}`,
      html,
      text,
    });
  }

  async sendSignRequestWithOTP(data: {
    tenantId?: number;
    recipientEmail: string;
    recipientName: string;
    documentTitle: string;
    documentNumber?: string;
    senderName: string;
    message?: string;
    signUrl: string;
    otp: string;
    expiryMinutes: number;
  }): Promise<void> {
    const docInfo = data.documentNumber
      ? `${data.documentTitle} (${data.documentNumber})`
      : data.documentTitle;
    const currentYear = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yêu cầu ký tài liệu</title>
</head>

<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Bạn nhận được một yêu cầu ký tài liệu cần xác thực bằng OTP trên hệ thống E-Office.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 12px 32px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:0;background:#0f172a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:28px 32px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#bfdbfe;">
                      E-OFFICE SIGNING REQUEST
                    </div>
                    <div style="margin-top:12px;font-size:26px;font-weight:800;line-height:1.3;">
                      Yêu cầu ký tài liệu
                    </div>
                    <div style="margin-top:8px;font-size:15px;line-height:1.6;color:#dbeafe;">
                      Vui lòng xác thực OTP để xem xét ký tài liệu được gửi đến bạn.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#111827;">
                Xin chào <strong>${data.recipientName}</strong>,
              </p>

              <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#374151;">
                <strong>${data.senderName}</strong> đã gửi cho bạn một tài liệu cần ký trên hệ thống E-Office.
                Để đảm bảo an toàn, vui lòng sử dụng mã OTP bên dưới để xác thực trước khi thực hiện ký tài liệu.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border:1px solid #e0e7ff;background:#f8fafc;border-radius:14px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <div style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">
                      Thông tin tài liệu
                    </div>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:6px 0;width:120px;font-size:14px;color:#64748b;vertical-align:top;">
                          Tài liệu:
                        </td>
                        <td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;line-height:1.5;">
                          ${docInfo}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;width:120px;font-size:14px;color:#64748b;vertical-align:top;">
                          Người gửi:
                        </td>
                        <td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;line-height:1.5;">
                          ${data.senderName}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 26px;border:2px dashed #3b82f6;background:#eff6ff;border-radius:16px;">
                <tr>
                  <td align="center" style="padding:28px 18px;">
                    <div style="font-size:13px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">
                      Mã xác thực OTP
                    </div>

                    <div style="font-size:38px;line-height:1;font-weight:800;letter-spacing:10px;color:#1d4ed8;font-family:Arial,Helvetica,sans-serif;">
                      ${data.otp}
                    </div>

                    <div style="font-size:14px;color:#475569;margin-top:14px;line-height:1.6;">
                      Mã OTP có hiệu lực trong <strong>${data.expiryMinutes} phút</strong>.
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 24px;">
                <tr>
                  <td align="center" bgcolor="#2563eb" style="border-radius:12px;background:#2563eb;box-shadow:0 8px 20px rgba(37,99,235,0.28);">
                    <a href="${data.signUrl}" target="_blank" style="display:block;padding:16px 30px;font-size:16px;line-height:18px;font-weight:700;font-family:Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:12px;">
                      Mở tài liệu để ký ngay
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#92400e;">
                    <strong>Lưu ý bảo mật:</strong> Không chia sẻ mã OTP này cho bất kỳ ai.
                    Nếu bạn không nhận ra yêu cầu ký này, vui lòng bỏ qua email hoặc liên hệ người gửi để xác minh.
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">
                Nếu bạn không thể mở tài liệu, vui lòng sao chép và dán liên kết sau vào trình duyệt:
              </p>

              <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;">
                <a href="${data.signUrl}" target="_blank" style="color:#2563eb;text-decoration:underline;">
                  ${data.signUrl}
                </a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#6b7280;">
                Đây là email tự động từ hệ thống E-Office. Vui lòng không trả lời trực tiếp email này.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                ? ${currentYear} E-Office. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    await sendEmail({
      tenantId: data.tenantId,
      to: data.recipientEmail,
      subject: `[E-Office] OTP ký tài liệu: ${docInfo}`,
      html,
      text: `Xin chào ${data.recipientName}

${data.senderName} đã gửi cho bạn yêu cầu ký tài liệu: ${docInfo}

M? OTP: ${data.otp}
Hi?u l?c: ${data.expiryMinutes} ph?t
Link k?: ${data.signUrl}`,
    });
  }

  async sendSignRequestNotification(data: {
    tenantId?: number;
    recipientEmail: string;
    recipientName: string;
    documentTitle: string;
    documentNumber?: string; // ✅ Add document number
    senderName: string;
    message?: string;
    signUrl: string;
  }): Promise<void> {
    const docInfo = data.documentNumber 
      ? `${data.documentTitle} (${data.documentNumber})`
      : data.documentTitle;
    
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
          .doc-info { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; border-radius: 4px; }
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
            <div class="doc-info">
              <p style="margin: 0;"><strong>📄 Tài liệu:</strong> ${data.documentTitle}</p>
              ${data.documentNumber ? `<p style="margin: 5px 0 0 0; color: #666;"><strong>🔢 Mã số:</strong> ${data.documentNumber}</p>` : ''}
            </div>
            ${data.message ? `<p><strong>💬 Lời nhắn:</strong> ${data.message}</p>` : ""}
            <p>Vui lòng nhấn vào nút bên dưới để xem và ký tài liệu:</p>
            <a href="${data.signUrl}" class="button">Xem và ký tài liệu</a>
            <p style="color: #666; font-size: 14px;">Hoặc copy link sau vào trình duyệt:<br>${data.signUrl}</p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động từ E-Office. Vui lòng không trả lời email này.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      tenantId: data.tenantId,
      to: data.recipientEmail,
      subject: `Yêu cầu ký tài liệu: ${docInfo}`,
      html,
      text: `Xin chào ${data.recipientName},\n\n${data.senderName} đã gửi cho bạn yêu cầu ký tài liệu: ${docInfo}\n\nVui lòng truy cập: ${data.signUrl}`,
    });
  }

  async sendApprovalRequestNotification(data: {
    tenantId?: number;
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
      tenantId: data.tenantId,
      to: data.recipientEmail,
      subject: `[Phê duyệt] ${data.documentTitle}`,
      html,
      text,
    });
  }

  async sendApprovalActionNotification(data: {
    tenantId?: number;
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
      tenantId: data.tenantId,
      to: data.recipientEmail,
      subject: `[${actionText.title}] ${data.documentTitle}`,
      html,
      text,
    });
  }

  async sendWorkflowCompletedNotification(data: {
    tenantId?: number;
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
      tenantId: data.tenantId,
      to: data.recipientEmail,
      subject: `[Hoàn tất] ${data.documentTitle}`,
      html,
      text,
    });
  }

  async sendSignCompletedNotification(data: {
    tenantId?: number;
    recipientEmail: string;
    recipientName: string;
    documentTitle: string;
    documentNumber?: string;
    signerName: string;
    documentUrl?: string;
  }): Promise<void> {
    const docInfo = data.documentNumber
      ? `${data.documentTitle} (${data.documentNumber})`
      : data.documentTitle;

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
          .button { display: inline-block; background: #059669; color: white !important; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; }
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
            <p><strong>${docInfo}</strong></p>
            <p>Bạn có thể xem tài liệu đã ký trong hệ thống.</p>
            ${data.documentUrl ? `<p><a href="${data.documentUrl}" class="button">Xem tài liệu</a></p>` : ''}
          </div>
          <div class="footer">
            <p>Email này được gửi tự động từ WP Sign.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      tenantId: data.tenantId,
      to: data.recipientEmail,
      subject: `Tài liệu đã được ký: ${docInfo}`,
      html,
      text: `Xin chào ${data.recipientName}

${data.signerName} đã ký thành công tài liệu: ${docInfo}${data.documentUrl ? `

Xem tài liệu: ${data.documentUrl}` : ''}`,
    });
  }

  private generateOtpEmailHtml(data: OtpEmailData): string {
    return getOtpEmailTemplate({
      recipientName: data.recipientName,
      otp: data.otp,
      documentTitle: data.documentTitle,
      expiryMinutes: data.expiryMinutes,
    });
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

  async sendDocumentSharedEmail(data: {
    tenantId?: number;
    recipientEmail: string;
    documentTitle: string;
    documentNumber?: string;
    senderName: string;
    message?: string;
    documentUrl: string;
  }): Promise<void> {
    const docInfo = data.documentNumber 
      ? `${data.documentTitle} (${data.documentNumber})`
      : data.documentTitle;
    
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
          .doc-info { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; border-radius: 4px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📄 Tài liệu được chia sẻ</h1>
          </div>
          <div class="content">
            <p>Xin chào,</p>
            <p><strong>${data.senderName}</strong> đã chia sẻ tài liệu với bạn (CC):</p>
            
            <div class="doc-info">
              <strong>📄 Tài liệu:</strong> ${docInfo}
            </div>
            
            ${data.message ? `
            <div class="doc-info">
              <strong>💬 Lời nhắn:</strong><br>
              ${data.message}
            </div>
            ` : ''}
            
            <p>Bạn có thể xem tài liệu này để tham khảo.</p>
            
            <div style="text-align: center;">
              <a href="${data.documentUrl}" class="button">Xem tài liệu</a>
            </div>
            
            <div class="footer">
              <p>Email này được gửi tự động từ hệ thống E-Office</p>
              <p>Vui lòng không trả lời email này</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Tài liệu được chia sẻ

${data.senderName} đã chia sẻ tài liệu với bạn (CC):

Tài liệu: ${docInfo}
${data.message ? `\nLời nhắn: ${data.message}\n` : ''}
Xem tài liệu: ${data.documentUrl}

---
Email này được gửi tự động từ hệ thống E-Office
    `;

    await sendEmail({
      tenantId: data.tenantId,
      to: data.recipientEmail,
      subject: `📄 [CC] ${docInfo}`,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
