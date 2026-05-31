import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateClientDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  contactPerson: string;

  @IsEmail() @IsNotEmpty()
  email: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  @IsOptional() @IsUUID()
  businessUnitId?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class SetClientStatusDto {
  @IsBoolean()
  isActive: boolean;
}
