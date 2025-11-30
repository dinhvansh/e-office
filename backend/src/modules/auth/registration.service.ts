import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sendEmail } from '../../config/email';

const prisma = new PrismaClient();

export class RegistrationService {
  // Public registration - creates user with 'pending' status
  async registerUser(data: {
    email: string;
    password: string;
    full_name: string;
    tenant_id?: number;
  }): Promise<{ success: boolean; message: string; userId?: number }> {
    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      if (existingUser.status === 'rejected') {
        // Check if 24 hours have passed since rejection
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (existingUser.created_at > oneDayAgo) {
          throw new Error('You can re-register 24 hours after rejection.');
        }
        // Allow re-registration by deleting old rejected account
        await prisma.users.delete({ where: { id: existingUser.id } });
      } else {
        throw new Error('Email already registered.');
      }
    }

    // Validate password strength
    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Get default tenant (tenant_id = 1) if not provided
    const tenantId = data.tenant_id || 1;

    // Create user with 'pending' status
    const user = await prisma.users.create({
      data: {
        email: data.email,
        password_hash: passwordHash,
        full_name: data.full_name,
        tenant_id: tenantId,
        status: 'pending',
        role: 'user'
      }
    });

    // Send emails asynchronously (don't wait)
    sendEmail({
      to: user.email,
      subject: 'Đăng ký thành công - Chờ phê duyệt',
      html: this.getRegistrationConfirmationEmail(user.full_name || 'User')
    }).catch(err => console.error('Failed to send registration email:', err));

    // Notify admins about new registration (async)
    this.notifyAdminsAboutNewRegistration(user).catch(err => 
      console.error('Failed to notify admins:', err)
    );

    return {
      success: true,
      message: 'Registration successful. Please wait for admin approval.',
      userId: user.id
    };
  }

  // Admin approves user
  async approveUser(userId: number, approvedBy: number): Promise<{ success: boolean; message: string }> {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found.');
    }

    if (user.status !== 'pending') {
      throw new Error('User is not in pending status.');
    }

    // Update user status to active
    await prisma.users.update({
      where: { id: userId },
      data: { status: 'active' }
    });

    // Assign default role (User role)
    const defaultRole = await prisma.roles.findFirst({
      where: {
        tenant_id: user.tenant_id,
        name: 'User'
      }
    });

    if (defaultRole) {
      await prisma.user_roles.create({
        data: {
          user_id: userId,
          role_id: defaultRole.id
        }
      });
    }

    // Send approval email (async)
    sendEmail({
      to: user.email,
      subject: 'Tài khoản đã được kích hoạt - E-Office',
      html: this.getApprovalEmail(user.full_name || 'User')
    }).catch(err => console.error('Failed to send approval email:', err));

    return {
      success: true,
      message: 'User approved successfully.'
    };
  }

  // Admin rejects user
  async rejectUser(userId: number, reason: string, rejectedBy: number): Promise<{ success: boolean; message: string }> {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found.');
    }

    if (user.status !== 'pending') {
      throw new Error('User is not in pending status.');
    }

    // Update user status to rejected
    await prisma.users.update({
      where: { id: userId },
      data: { status: 'rejected' }
    });

    // Send rejection email (async)
    sendEmail({
      to: user.email,
      subject: 'Đăng ký không được chấp nhận - E-Office',
      html: this.getRejectionEmail(user.full_name || 'User', reason)
    }).catch(err => console.error('Failed to send rejection email:', err));

    return {
      success: true,
      message: 'User rejected successfully.'
    };
  }

  // Get pending users for admin
  async getPendingUsers(tenantId: number): Promise<any[]> {
    return await prisma.users.findMany({
      where: {
        tenant_id: tenantId,
        status: 'pending'
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  }

  // Notify admins about new registration
  private async notifyAdminsAboutNewRegistration(user: any): Promise<void> {
    // Find all admin users in the tenant
    const adminRole = await prisma.roles.findFirst({
      where: {
        tenant_id: user.tenant_id,
        name: 'Admin'
      },
      include: {
        user_roles: {
          include: {
            user: true
          }
        }
      }
    });

    if (adminRole) {
      const adminEmails = adminRole.user_roles
        .map(ur => ur.user.email)
        .filter(email => email);

      for (const adminEmail of adminEmails) {
        await sendEmail({
          to: adminEmail,
          subject: 'Đăng ký mới cần phê duyệt - E-Office',
          html: this.getAdminNotificationEmail(user.full_name, user.email)
        });
      }
    }
  }

  // Email templates
  private getRegistrationConfirmationEmail(userName: string): string {
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
          .info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 12px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Đăng ký thành công!</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản E-Office!</p>
            <div class="info">
              <p><strong>ℹ️ Trạng thái:</strong> Tài khoản của bạn đang chờ phê duyệt từ quản trị viên.</p>
            </div>
            <p>Chúng tôi sẽ gửi email thông báo khi tài khoản được kích hoạt. Thời gian xử lý thường trong vòng 24 giờ.</p>
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

  private getApprovalEmail(userName: string): string {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
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
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 12px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Tài khoản đã được kích hoạt!</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            <div class="success">
              <p><strong>✓ Chúc mừng!</strong> Tài khoản E-Office của bạn đã được phê duyệt và kích hoạt.</p>
            </div>
            <p>Bạn có thể đăng nhập và bắt đầu sử dụng hệ thống ngay bây giờ:</p>
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Đăng nhập ngay</a>
            </div>
            <p>Chúc bạn có trải nghiệm tốt với E-Office!</p>
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

  private getRejectionEmail(userName: string, reason: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Đăng ký không được chấp nhận</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            <p>Rất tiếc, đăng ký tài khoản E-Office của bạn không được chấp nhận.</p>
            <div class="warning">
              <p><strong>Lý do:</strong></p>
              <p>${reason}</p>
            </div>
            <p>Nếu bạn có thắc mắc hoặc muốn biết thêm thông tin, vui lòng liên hệ với quản trị viên.</p>
            <p>Bạn có thể đăng ký lại sau 24 giờ nếu muốn.</p>
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

  private getAdminNotificationEmail(userName: string, userEmail: string): string {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/users`;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .info { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Đăng ký mới cần phê duyệt</h1>
          </div>
          <div class="content">
            <p>Xin chào Admin,</p>
            <p>Có một đăng ký tài khoản mới cần được phê duyệt:</p>
            <div class="info">
              <p><strong>Tên:</strong> ${userName}</p>
              <p><strong>Email:</strong> ${userEmail}</p>
            </div>
            <p>Vui lòng xem xét và phê duyệt hoặc từ chối đăng ký này:</p>
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Xem danh sách chờ duyệt</a>
            </div>
            <p>Trân trọng,<br><strong>E-Office System</strong></p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const registrationService = new RegistrationService();
