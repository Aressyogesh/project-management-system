import { IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateTimesheetEntryDto {
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty() @IsNumber() @Min(0.25) @Max(24) hours: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class UpdateTimesheetEntryDto extends PartialType(CreateTimesheetEntryDto) {}
