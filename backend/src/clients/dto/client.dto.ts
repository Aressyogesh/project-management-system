import { PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export interface AdditionalContact {
  contactPerson: string;
  designation?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export class CreateClientDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  contactPerson: string;

  @IsOptional() @IsString() @MaxLength(100)
  designation?: string;

  @IsEmail() @IsNotEmpty()
  email: string;

  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  @IsOptional() @IsUUID()
  businessUnitId?: string;

  @IsOptional() @IsArray()
  additionalContacts?: AdditionalContact[];
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class SetClientStatusDto {
  @IsBoolean()
  isActive: boolean;
}
