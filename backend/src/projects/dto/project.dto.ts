import { PartialType } from '@nestjs/swagger';
import { ProjectStatus, ProjectType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateProjectDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsEnum(ProjectType)
  projectType: ProjectType;

  @IsOptional() @IsUUID()
  clientId?: string;

  @IsOptional() @IsUUID()
  departmentId?: string;

  @IsOptional() @IsString() @MaxLength(10000)
  description?: string;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  @ValidateIf((o) => o.startDate !== undefined)
  endDate?: string;

  @IsOptional() @IsNumber() @IsPositive()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  budget?: number;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class SetProjectStatusDto {
  @IsEnum(ProjectStatus)
  status: ProjectStatus;
}

export class ProjectsQueryDto {
  @IsOptional() @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional() @IsEnum(ProjectType)
  type?: ProjectType;
}
