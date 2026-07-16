import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
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
  @IsInt()
  @Min(1)
  @Max(8)
  engagementHours?: number | null;
}
