import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Logo embedded as base64 — no file system dependency across environments
const PMS_LOGO_BASE64 = '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';

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
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:540px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a6ab1 0%,#0077CC 60%,#00A7E1 100%);padding:28px 32px 24px;text-align:center;">
              <!-- White card mirroring the login screen logo card -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px auto;">
                <tr>
                  <td style="background:#ffffff;border-radius:12px;padding:12px 24px;text-align:center;">
                    <img src="cid:pms-logo"
                         alt="Aress PMS"
                         width="140"
                         style="height:auto;display:block;margin:0 auto;" />
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:0.3px;">
                Plan. Track. Deliver. <em>Successfully..</em>
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 24px;">
              <h2 style="margin:0 0 20px;color:#111827;font-size:20px;font-weight:700;">${title}</h2>
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 36px 28px;border-top:1px solid #f0f2f5;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                This email was sent by <strong style="color:#6b7280;">Aress PMS</strong>. Please do not reply to this email.
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
        attachments: [{
          filename: 'pms-logo.png',
          content: Buffer.from(PMS_LOGO_BASE64, 'base64'),
          contentType: 'image/png',
          cid: 'pms-logo',
        }],
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
           style="display:inline-block;background:#1a6ab1;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
          Reset Password
        </a>
      </div>
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Or copy and paste this link into your browser:</p>
      <p style="margin:0 0 24px;word-break:break-all;">
        <a href="${resetLink}" style="color:#1a6ab1;font-size:13px;">${resetLink}</a>
      </p>
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;">
        <p style="margin:0;color:#92400e;font-size:13px;">
          <strong>This link expires in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>`;

    await this.sendEmail(to, 'Reset your PMS password', this.wrapHtml('Reset your password', body));
  }
}
