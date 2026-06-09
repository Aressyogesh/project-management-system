import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT') ?? 465,
      secure: true,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
      tls: { rejectUnauthorized: false },
    });
  }

  wrapHtml(title: string, bodyHtml: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr>
            <td style="background:#4f46e5;padding:28px 32px;text-align:center;">
              <span style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 18px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">PMS</span>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Project Management System</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;">
              <h2 style="margin:0 0 20px;color:#111827;font-size:20px;font-weight:700;">${title}</h2>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                This email was sent by Project Management System. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const fromName = this.config.get<string>('SMTP_FROM_NAME') ?? 'PMS';
    const fromEmail = this.config.get<string>('SMTP_FROM_EMAIL') ?? this.config.get<string>('SMTP_USER');

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to} — "${subject}"`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to} — "${subject}": ${(err as Error).message}`);
      throw err;
    }
  }

  async sendPasswordReset(to: string, fullName: string, resetLink: string): Promise<void> {
    const body = `
      <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
        Hi ${fullName}, we received a request to reset the password for your PMS account.
        Click the button below to choose a new password.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetLink}"
           style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
          Reset Password
        </a>
      </div>
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Or copy and paste this link into your browser:</p>
      <p style="margin:0 0 24px;word-break:break-all;">
        <a href="${resetLink}" style="color:#4f46e5;font-size:13px;">${resetLink}</a>
      </p>
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;">
        <p style="margin:0;color:#92400e;font-size:13px;">
          <strong>This link expires in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>`;

    await this.sendEmail(to, 'Reset your PMS password', this.wrapHtml('Reset your password', body));
  }
}
