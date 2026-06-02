import { IsString, IsOptional, IsArray, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationTurnDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(5000)
  content: string;
}

export class ChatMessageDto {
  @ApiProperty({ description: 'Natural language question', maxLength: 1000 })
  @IsString()
  @MinLength(1, { message: 'Message cannot be empty' })
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters' })
  message: string;

  @ApiPropertyOptional({ description: 'Scope queries to a specific project' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Multi-turn conversation ID' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Prior conversation turns (max 10)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationTurnDto)
  history?: ConversationTurnDto[];
}
