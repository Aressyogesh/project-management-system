import { SetMetadata } from '@nestjs/common';
import { ProjectRole } from '@prisma/client';

export const PROJECT_ROLES_KEY = 'projectRoles';
export const PROJECT_ID_SOURCE_KEY = 'projectIdSource';

export type ProjectIdSource = 'param' | 'taskList' | 'task' | 'milestone';

export const ProjectRoles = (...roles: ProjectRole[]) =>
  SetMetadata(PROJECT_ROLES_KEY, roles);

export const ProjectIdFrom = (source: ProjectIdSource) =>
  SetMetadata(PROJECT_ID_SOURCE_KEY, source);
