import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

const PROFILE_SELECT = {
  id: true, fullName: true, email: true,
  profilePhoto: true, systemRole: true,
  phone: true, joinDate: true,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makePrisma(): any {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('UsersService — profile methods', () => {
  describe('getProfile', () => {
    it('returns user when found', async () => {
      const stub = { id: 'u1', fullName: 'Alice', email: 'a@test.com' };
      const prisma = makePrisma();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(stub);
      const svc = new UsersService(prisma as never);
      const result = await svc.getProfile('u1');
      expect(result).toBe(stub);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: PROFILE_SELECT });
    });

    it('throws NotFoundException when user missing', async () => {
      const prisma = makePrisma();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const svc = new UsersService(prisma as never);
      await expect(svc.getProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('updates fullName and email without password change', async () => {
      const existing = { id: 'u1', passwordHash: 'hash' };
      const updated = { id: 'u1', fullName: 'Bob', email: 'bob@test.com' };
      const prisma = makePrisma();
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);
      const svc = new UsersService(prisma as never);
      const result = await svc.updateProfile('u1', { fullName: 'Bob', email: 'bob@test.com' });
      expect(result).toBe(updated);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ fullName: 'Bob', email: 'bob@test.com' }) }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      const prisma = makePrisma();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const svc = new UsersService(prisma as never);
      await expect(svc.updateProfile('nope', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when new email is taken by another user', async () => {
      const existing = { id: 'u1', passwordHash: 'hash' };
      const conflict = { id: 'u2' };
      const prisma = makePrisma();
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(conflict);
      const svc = new UsersService(prisma as never);
      await expect(svc.updateProfile('u1', { email: 'taken@test.com' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws BadRequestException when newPassword supplied without currentPassword', async () => {
      const existing = { id: 'u1', passwordHash: 'hash' };
      const prisma = makePrisma();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existing);
      const svc = new UsersService(prisma as never);
      await expect(svc.updateProfile('u1', { newPassword: 'secret123' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when currentPassword is incorrect', async () => {
      const hash = await bcrypt.hash('correct', 10);
      const existing = { id: 'u1', passwordHash: hash };
      const prisma = makePrisma();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existing);
      const svc = new UsersService(prisma as never);
      await expect(svc.updateProfile('u1', { currentPassword: 'wrong', newPassword: 'newpass' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('hashes new password when current password is correct', async () => {
      const hash = await bcrypt.hash('correct', 10);
      const existing = { id: 'u1', passwordHash: hash };
      const updated = { id: 'u1', fullName: 'Alice' };
      const prisma = makePrisma();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existing);
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);
      const svc = new UsersService(prisma as never);
      await svc.updateProfile('u1', { currentPassword: 'correct', newPassword: 'newpass123' });
      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.passwordHash).toBeDefined();
      const valid = await bcrypt.compare('newpass123', updateCall.data.passwordHash);
      expect(valid).toBe(true);
    });
  });
});
