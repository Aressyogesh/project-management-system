import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;

  @IsOptional()
  @IsBoolean()
  isPlanned?: boolean;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ApproveLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  approvalNote?: string;
}

export class RejectLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  approvalNote?: string;
}
