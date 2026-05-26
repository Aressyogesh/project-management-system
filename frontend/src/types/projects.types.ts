export type ProjectType = 'DEDICATED' | 'T_AND_M' | 'FIXED';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVE' | 'ON_HOLD';

export interface ProjectClient {
  id: string;
  name: string;
}

export interface ProjectDepartment {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: string | null;
  projectType: ProjectType;
  status: ProjectStatus;
  createdAt: string;
  client: ProjectClient | null;
  department: ProjectDepartment | null;
}

export interface ProjectSummary {
  active: number;
  archive: number;
  onHold: number;
  dedicated: number;
  tAndM: number;
  fixed: number;
  overdue: number;
}

export type ProjectRole =
  | 'PROJECT_MANAGER'
  | 'TEAM_LEAD'
  | 'DEVELOPER'
  | 'QA'
  | 'DESIGNER'
  | 'DEVOPS';

export interface ProjectMemberUser {
  id: string;
  fullName: string;
  email: string;
  profilePhoto: string | null;
  department: { id: string; name: string } | null;
}

export interface ProjectMember {
  id: string;
  projectRole: ProjectRole;
  joinedAt: string;
  user: ProjectMemberUser;
}

export interface CreateProjectPayload {
  name: string;
  projectType: ProjectType;
  clientId?: string;
  departmentId?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
}
