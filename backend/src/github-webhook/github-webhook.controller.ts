import { Controller, Headers, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { GithubWebhookService } from './github-webhook.service';

@ApiTags('GitHub Webhook')
@Controller('github')
export class GithubWebhookController {
  constructor(private readonly service: GithubWebhookService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'GitHub webhook — links PRs to work items by branch displayId' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Headers('x-github-event') event: string | undefined,
  ): Promise<{ ok: boolean }> {
    const rawBody: Buffer | undefined = (req as unknown as Record<string, unknown>)['rawBody'] as Buffer | undefined;

    if (rawBody && signature) {
      if (!this.service.verifySignature(rawBody, signature)) {
        throw new UnauthorizedException('Invalid GitHub webhook signature');
      }
    }

    if (event === 'pull_request') {
      await this.service.handlePullRequestEvent(req.body as Record<string, unknown>);
    }

    return { ok: true };
  }
}
