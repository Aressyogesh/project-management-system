import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'System Maintenance Tonight' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Please save your work before 10 PM.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
