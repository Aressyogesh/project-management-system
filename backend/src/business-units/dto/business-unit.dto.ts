import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBusinessUnitDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;
}

export class UpdateBusinessUnitDto extends PartialType(CreateBusinessUnitDto) {}

export class SetBusinessUnitStatusDto {
  @IsBoolean()
  isActive: boolean;
}
