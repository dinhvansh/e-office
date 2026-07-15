import { prisma } from '../../config/prisma';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sendEmail } from '../../config/email';


export class PasswordResetService {
  // Generate reset token and send email
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    // Find user by email
    const user = await prisma.users.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      // Don't reveal if email exists or not (security)
      return { success: true, message: 'If the email exists, a reset link has been sent.' };
    }

    // Check rate limiting - max 3 requests per 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentTokens = await prisma.password_reset_tokens.count({
      where: {
        user_id: user.id,
        created_at: { gte: fifteenMinutesAgo }
      }
    });

    if (recentTokens >= 3) {
      throw new Error('Too many reset requests. Please try again in 15 minutes.');
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await prisma.password_reset_tokens.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt
      }
    });

    // Send email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Đặt lại mật khẩu - E-Office',
      html: this.getResetEmailTemplate(user.full_name || 'User', resetLink)
    });

    return { success: true, message: 'Password reset link has been sent to your email.' };
  }

  // Verify reset token
  async verifyResetToken(token: string): Promise<{ valid: boolean; userId?: number }> {
    const resetToken = await prisma.password_reset_tokens.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken) {
      return { valid: false };
    }

    // Check if already used
    if (resetToken.used_at) {
      return { valid: false };
    }

    // Check if expired
    if (new Date() > resetToken.expires_at) {
      return { valid: false };
    }

    return { valid: true, userId: resetToken.user_id };
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Validate password strength
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const userId = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const resetToken = await tx.password_reset_tokens.findUnique({
        where: { token },
        select: { id: true, user_id: true, used_at: true, expires_at: true },
      });
      if (!resetToken || resetToken.used_at || resetToken.expires_at <= now) {
        throw new Error('Invalid or expired reset token.');
      }

      const claimed = await tx.password_reset_tokens.updateMany({
        where: { id: resetToken.id, used_at: null, expires_at: { gt: now } },
        data: { used_at: now },
      });
      if (claimed.count !== 1) {
        throw new Error('Invalid or expired reset token.');
      }

      await tx.users.update({
        where: { id: resetToken.user_id },
        data: { password_hash: passwordHash },
      });
      return resetToken.user_id;
    });

    // Send confirmation email
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (user) {
      await sendEmail({
        to: user.email,
        subject: 'Mật khẩu đã được đặt lại - E-Office',
        html: this.getPasswordChangedEmailTemplate(user.full_name || 'User')
      });
    }

    return { success: true, message: 'Password has been reset successfully.' };
  }

  // Email template for reset link
  private getResetEmailTemplate(userName: string, resetLink: string): string {
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
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Đặt lại mật khẩu</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản E-Office của bạn.</p>
            <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Đặt lại mật khẩu</a>
            </div>
            <p>Hoặc copy link sau vào trình duyệt:</p>
            <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${resetLink}</p>
            <div class="warning">
              <strong>⚠️ Lưu ý bảo mật:</strong>
              <ul style="margin: 10px 0;">
                <li>Link này chỉ có hiệu lực trong <strong>1 giờ</strong></li>
                <li>Link chỉ có thể sử dụng <strong>1 lần</strong></li>
                <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
              </ul>
            </div>
            <p>Trân trọng,<br><strong>E-Office Team</strong></p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Email template for password changed confirmation
  private getPasswordChangedEmailTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 12px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Mật khẩu đã được đặt lại</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            <div class="success">
              <p><strong>✓ Thành công!</strong> Mật khẩu của bạn đã được đặt lại.</p>
            </div>
            <p>Bạn có thể đăng nhập vào E-Office với mật khẩu mới.</p>
            <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với quản trị viên ngay lập tức.</p>
            <p>Trân trọng,<br><strong>E-Office Team</strong></p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Cleanup expired tokens (run periodically)
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.password_reset_tokens.deleteMany({
      where: {
        OR: [
          { expires_at: { lt: new Date() } },
          { used_at: { not: null } }
        ]
      }
    });

    return result.count;
  }
}

export const passwordResetService = new PasswordResetService();
