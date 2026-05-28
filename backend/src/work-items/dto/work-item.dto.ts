import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  BoardStatus,
  BugClassification,
  BugSeverity,
  TaskPriority,
  WorkItemType,
} from '@prisma/client';

export class CreateWorkItemDto {
  @ApiProperty({ enum: WorkItemType }) @IsEnum(WorkItemType) type: WorkItemType;
  @ApiProperty() @IsString() @MaxLength(300) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sprintId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assigneeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(999) storyPoints?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedHours?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) labels?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) components?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) fixVersion?: string;
  @ApiPropertyOptional({ enum: BugSeverity }) @IsOptional() @IsEnum(BugSeverity) severity?: BugSeverity;
  @ApiPropertyOptional({ enum: BugClassification }) @IsOptional() @IsEnum(BugClassification) bugClassification?: BugClassification;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) environment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3000) stepsToRepro?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateWorkItemDto extends PartialType(CreateWorkItemDto) {}

export class MoveWorkItemDto {
  @ApiProperty({ enum: BoardStatus }) @IsEnum(BoardStatus) status: BoardStatus;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) position?: number;
}
