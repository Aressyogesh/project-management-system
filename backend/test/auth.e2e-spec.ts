import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SystemRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth E2E (F-001)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany({ where: { email: { in: ['superadmin@pms.com', 'inactive@pms.com'] } } });

    const hash = await bcrypt.hash('Password@123', 10);

    await prisma.user.create({
      data: {
        fullName: 'Super Admin',
        email: 'superadmin@pms.com',
        passwordHash: hash,
        systemRole: SystemRole.SUPER_USER,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        fullName: 'Inactive User',
        email: 'inactive@pms.com',
        passwordHash: hash,
        systemRole: SystemRole.EMPLOYEE,
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany({ where: { email: { in: ['superadmin@pms.com', 'inactive@pms.com'] } } });
    await app.close();
  });

  // ─── POST /api/v1/auth/login ───────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('TC-F001-001: Valid credentials return 200 with tokens and user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@pms.com', password: 'Password@123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('superadmin@pms.com');
      expect(res.body.user.systemRole).toBe('SUPER_USER');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('TC-F001-002: Wrong password returns 401', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@pms.com', password: 'wrongpass' })
        .expect(401));

    it('TC-F001-003: Unknown email returns same 401 (no enumeration)', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@pms.com', password: 'wrongpass' })
        .expect(401);

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@pms.com', password: 'anypass' })
        .expect(401);

      expect(res1.body.statusCode).toBe(res2.body.statusCode);
    });

    it('TC-F001-004: Inactive account returns 403', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'inactive@pms.com', password: 'Password@123' })
        .expect(403));

    it('TC-F001-005: Missing email returns 400', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: 'Password@123' })
        .expect(400));

    it('TC-F001-006: Invalid email format returns 400', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'Password@123' })
        .expect(400));
  });

  // ─── POST /api/v1/auth/refresh ─────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@pms.com', password: 'Password@123' });
      refreshToken = res.body.refreshToken;
    });

    it('TC-F001-007: Valid refresh token returns new token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('TC-F001-008: Reusing same refresh token returns 401 (rotation enforced)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  // ─── POST /api/v1/auth/logout ──────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('TC-F001-009: Logout revokes token and returns 204', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@pms.com', password: 'Password@123' });

      const { accessToken, refreshToken } = loginRes.body;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  // ─── Protected route guard ─────────────────────────────────────────────────

  describe('JWT Guard', () => {
    it('TC-F001-010: Protected route without token returns 401', () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'any-token' })
        .expect(401));
  });
});
