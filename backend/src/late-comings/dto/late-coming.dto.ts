import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateLateComingDto {
  @IsString()
  targetUserId: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  @Max(480)
  minutesLate: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
