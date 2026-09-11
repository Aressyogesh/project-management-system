import { apiClient } from './client';

export type TestCaseStatus = 'NOT_RUN' | 'PASSED' | 'FAILED' | 'BLOCKED';

export interface TestCase {
  id: string;
  workItemId: string;
  title: string;
  preconditions?: string | null;
  steps: string;
  expectedResult: string;
  actualResult?: string | null;
  status: TestCaseStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; fullName: string };
}

export interface CreateTestCaseDto {
  title: string;
  preconditions?: string;
  steps: string;
  expectedResult: string;
}

export interface UpdateTestCaseDto {
  title?: string;
  preconditions?: string;
  steps?: string;
  expectedResult?: string;
  actualResult?: string;
  status?: TestCaseStatus;
}

export const testCasesApi = {
  list: (workItemId: string) =>
    apiClient.get<TestCase[]>(`/work-items/${workItemId}/test-cases`).then((r) => r.data),

  create: (workItemId: string, dto: CreateTestCaseDto) =>
    apiClient.post<TestCase>(`/work-items/${workItemId}/test-cases`, dto).then((r) => r.data),

  update: (id: string, dto: UpdateTestCaseDto) =>
    apiClient.patch<TestCase>(`/test-cases/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/test-cases/${id}`).then(() => undefined),
};
