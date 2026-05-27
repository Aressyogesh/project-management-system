import { IsDateString, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateTaskAllocationDto {
  @IsUUID()
  taskId: string;

  @IsUUID()
  userId: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0.5)
  @Max(8)
  allocatedHours: number;
}

export class UpdateTaskAllocationDto {
  @IsNumber()
  @Min(0.5)
  @Max(8)
  allocatedHours: number;
}

export class CheckAllocationDto {
  @IsUUID()
  userId: string;

  @IsDateString()
  date: string;
}
