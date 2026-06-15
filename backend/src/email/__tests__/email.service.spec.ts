import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { EmailService } from '../email.service';

const mockSendMail = jest.fn().mockResolvedValue({});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const mockConfig = {
  get: jest.fn((key: string) => {
    const values: Record<string, string | number> = {
      SMTP_HOST: 'cp1.aress.net',
      SMTP_PORT: 465,
      SMTP_USER: 'pmtool@aress.net',
      SMTP_PASS: 'secret',
      SMTP_FROM_NAME: 'PMS',
      SMTP_FROM_EMAIL: 'pmtool@aress.net',
    };
    return values[key];
  }),
};

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({});
  });

  describe('sendEmail', () => {
    it('UTC-F038-B-001: SendEmail_ValidParams_CallsSendMailOnce', async () => {
      await service.sendEmail('user@example.com', 'Test Subject', '<p>Hello</p>');

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Subject',
          html: '<p>Hello</p>',
        }),
      );
    });

    it('UTC-F038-B-004: SendEmail_SmtpRejects_LogsErrorAndRethrows', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        service.sendEmail('u@example.com', 'Sub', '<p>body</p>'),
      ).rejects.toThrow('Connection refused');
    });

    it('UTC-F038-B-005: SendEmail_ReadsFromAddressFromConfig_UsesConfigValues', async () => {
      await service.sendEmail('dest@example.com', 'Sub', '<p>body</p>');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining('pmtool@aress.net'),
        }),
      );
    });
  });

  describe('wrapHtml', () => {
    it('UTC-F038-B-002: WrapHtml_ValidTitleAndBody_ReturnsCompleteHtmlDocument', () => {
      const result = service.wrapHtml('Welcome', '<p>Hello World</p>');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Welcome');
      expect(result).toContain('<p>Hello World</p>');
      expect(result).toContain('PMS');
      expect(result).toContain('Project Management System');
    });
  });

  describe('sendPasswordReset', () => {
    it('UTC-F038-B-003: SendPasswordReset_ValidParams_CallsSendEmailWithWrappedHtml', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue();

      await service.sendPasswordReset('user@pms.com', 'John Doe', 'http://localhost/reset?token=abc');

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const [to, , html] = sendEmailSpy.mock.calls[0];
      expect(to).toBe('user@pms.com');
      expect(html).toContain('http://localhost/reset?token=abc');
      expect(html).toContain('John Doe');
    });
  });
});
