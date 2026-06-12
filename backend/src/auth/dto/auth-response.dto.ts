import { ApiProperty } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() fullName: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: SystemRole }) systemRole: SystemRole;
  @ApiProperty({ required: false, nullable: true }) profilePhoto?: string | null;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}

export class TokenPairDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
}
