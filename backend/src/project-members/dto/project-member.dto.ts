import { IsEnum, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { MemberBilling, MemberEngagement, ProjectRole } from '@prisma/client';

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(ProjectRole)
  projectRole: ProjectRole;
}

export class UpdateMemberRoleDto {
  @IsEnum(ProjectRole)
  projectRole: ProjectRole;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(ProjectRole)
  projectRole?: ProjectRole;

  @IsOptional()
  @IsEnum(MemberBilling)
  billing?: MemberBilling;

  @IsOptional()
  @IsEnum(MemberEngagement)
  engagement?: MemberEngagement;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(8.5)
  engagementHours?: number | null;
}
