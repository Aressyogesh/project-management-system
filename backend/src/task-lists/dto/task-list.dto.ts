import { PartialType } from '@nestjs/mapped-types';
import { TaskListType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateTaskListDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsEnum(TaskListType)
  type: TaskListType;

  @ValidateIf((o) => o.type === TaskListType.SPRINT)
  @IsInt()
  @Min(1)
  sprintNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateTaskListDto extends PartialType(CreateTaskListDto) {}
