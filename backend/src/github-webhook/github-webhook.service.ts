import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GithubWebhookService {
  private readonly logger = new Logger(GithubWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  verifySignature(rawBody: Buffer, signature: string): boolean {
    const secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET');
    if (!secret) return true;
    const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async handlePullRequestEvent(payload: Record<string, unknown>): Promise<void> {
    const pr = payload['pull_request'] as Record<string, unknown> | undefined;
    const action = payload['action'] as string | undefined;
    if (!pr || !action) return;

    const branch = ((pr['head'] as Record<string, unknown>)?.['ref'] as string) ?? '';
    // Match displayId: 2–6 uppercase letters followed by digits (e.g., HOR1, TAB42)
    const match = branch.match(/([A-Za-z]{2,6}\d+)/);
    if (!match) {
      this.logger.log(`PR #${pr['number']}: branch "${branch}" has no work item displayId — skipping`);
      return;
    }
    const displayId = match[1].toUpperCase();

    const workItem = await this.prisma.workItem.findUnique({ where: { displayId } });
    if (!workItem) {
      this.logger.log(`PR #${pr['number']}: no work item found for displayId "${displayId}"`);
      return;
    }

    const merged = pr['merged'] as boolean | undefined;
    let prState: string;
    if (action === 'closed' && merged) prState = 'merged';
    else if (action === 'closed') prState = 'closed';
    else prState = 'open';

    await this.prisma.workItem.update({
      where: { id: workItem.id },
      data: {
        prUrl: pr['html_url'] as string,
        prNumber: pr['number'] as number,
        prTitle: ((pr['title'] as string) ?? '').slice(0, 200) || null,
        prState,
      },
    });

    this.logger.log(`Work item "${displayId}" linked to PR #${pr['number']} (${prState})`);
  }
}
