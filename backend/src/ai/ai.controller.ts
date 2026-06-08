import { Body, Controller, Post, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  chat(@Body() dto: ChatDto, @Request() req: { user: { id: string; systemRole: string; fullName: string } }) {
    return this.aiService.chat(dto, req.user);
  }
}
