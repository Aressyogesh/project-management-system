import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateLeaveRequestDto {
  @IsEnum(LeaveType)
  type: LeaveType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

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
