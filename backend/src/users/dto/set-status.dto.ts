import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
