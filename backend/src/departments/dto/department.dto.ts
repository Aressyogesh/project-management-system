import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}

export class SetDepartmentStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
