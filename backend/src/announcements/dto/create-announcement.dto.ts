import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementScope } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'System Maintenance Tonight' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Please save your work before 10 PM.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ enum: AnnouncementScope, default: AnnouncementScope.GLOBAL })
  @IsOptional()
  @IsEnum(AnnouncementScope)
  scope?: AnnouncementScope;

  @ApiPropertyOptional({ description: 'Required when scope is PROJECT' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
