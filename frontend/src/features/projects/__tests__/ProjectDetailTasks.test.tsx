import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { tasksApi } from '../../../api/tasks.api';
import { taskListsApi } from '../../../api/taskLists.api';
import { milestonesApi } from '../../../api/milestones.api';
import { projectsApi } from '../../../api/projects.api';
import { useAuthStore } from '../../../store/authStore';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';

jest.mock('../../../api/projects.api');
jest.mock('../../../api/milestones.api');
jest.mock('../../../api/taskLists.api');
jest.mock('../../../api/tasks.api');
jest.mock('../../../api/users.api', () => ({
  usersApi: { list: jest.fn().mockResolvedValue({ data: [], total: 0 }) },
}));
jest.mock('../../../store/authStore');

const mockProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>;
const mockMilestonesApi = milestonesApi as jest.Mocked<typeof milestonesApi>;
const mockTaskListsApi = taskListsApi as jest.Mocked<typeof taskListsApi>;
const mockTasksApi = tasksApi as jest.Mocked<typeof tasksApi>;

const mockProject = {
  id: 'proj-001', name: 'Alpha Mobile App', description: null,
  startDate: null, endDate: null, budget: null,
  projectType: 'DEDICATED' as const, status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z', client: null, department: null,
};

const mockTaskList = {
  id: 'tl-001', name: 'Sprint 1 Tasks', type: 'SPRINT' as const,
  sprintNumber: 1, description: null, createdAt: '2026-01-01T00:00:00.000Z',
};

const mockTask = {
  id: 'task-001', title: 'Implement login page',
  description: null, priority: 'MEDIUM' as const, billingStatus: 'BILLABLE' as const,
  status: 'NOT_STARTED' as const, estimatedHours: null,
  startDate: null, dueDate: null, createdAt: '2026-01-01T00:00:00.000Z',
  taskList: { id: 'tl-001', name: 'Sprint 1 Tasks', type: 'SPRINT' },
  milestone: null, assignedTo: null,
  createdBy: { id: 'user-001', fullName: 'Admin User' },
};

function renderPage(role = 'SUPER_USER') {
  (useAuthStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ user: { systemRole: role } }),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/projects/proj-001']}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockProjectsApi.getById.mockResolvedValue(mockProject);
  mockProjectsApi.listMembers.mockResolvedValue([]);
  mockMilestonesApi.list.mockResolvedValue([]);
  mockTaskListsApi.list.mockResolvedValue([mockTaskList]);
  mockTasksApi.list.mockResolvedValue([mockTask]);
});

// UTC-F-011-FE-001
it('TasksSection_LoadsTasks_DisplaysTitle', async () => {
  renderPage();
  expect(await screen.findByText('Implement login page')).toBeInTheDocument();
});

// UTC-F-011-FE-002
it('TasksSection_EmptyState_ShowsMessage', async () => {
  mockTasksApi.list.mockResolvedValue([]);
  renderPage();
  expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();
});

// UTC-F-011-FE-003
it('TasksSection_AdminRole_ShowsAddButton', async () => {
  renderPage('ADMIN');
  expect(await screen.findByText('Implement login page')).toBeInTheDocument();
  expect(screen.getByText('Add Task')).toBeInTheDocument();
});

// UTC-F-011-FE-004
it('TasksSection_EmployeeRole_HidesAddButton', async () => {
  renderPage('EMPLOYEE');
  expect(await screen.findByText('Implement login page')).toBeInTheDocument();
  expect(screen.queryByText('Add Task')).not.toBeInTheDocument();
});

// UTC-F-011-FE-005
it('TasksSection_AddButton_OpensModal', async () => {
  renderPage();
  await screen.findByText('Implement login page');
  fireEvent.click(screen.getByText('Add Task'));
  expect(await screen.findByText('Add Task', { selector: 'h2' })).toBeInTheDocument();
});
