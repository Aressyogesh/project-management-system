import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatResponseDto, HealthResponseDto } from './dto/chat-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('AI Assistant')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message to the AI assistant' })
  async chat(
    @Body() dto: ChatMessageDto,
    @CurrentUser() user: { id: string; systemRole: string },
  ): Promise<ChatResponseDto> {
    return this.aiService.chat(dto, user.id, user.systemRole as any);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check Ollama connectivity and model status' })
  async health(): Promise<HealthResponseDto> {
    return this.aiService.getHealth();
  }
}
