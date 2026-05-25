import { BadRequestException, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { body } = context.switchToHttp().getRequest<{ body: Record<string, unknown> }>();
    const email = body?.email;
    const password = body?.password;

    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new BadRequestException(['email should not be empty']);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email as string)) {
      throw new BadRequestException(['email must be an email']);
    }
    if (!password || typeof password !== 'string') {
      throw new BadRequestException(['password should not be empty']);
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
