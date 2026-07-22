import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { projectsApi } from '../../../api/projects.api';
import { useAuthStore } from '../../../store/authStore';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';

jest.mock('../../../api/projects.api');
jest.mock('../../../api/users.api');
jest.mock('../../../store/authStore');

const mockProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>;

const mockProject = {
  id: 'proj-001',
  name: 'Alpha Mobile App',
  description: 'A great app',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  budget: '500000',
  projectType: 'DEDICATED' as const,
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  client: { id: 'c-001', name: 'Acme Corp' },
  department: { id: 'd-001', name: 'Engineering' },
};

const mockMember = {
  id: 'mem-001',
  projectRole: 'DEVELOPER' as const,
  joinedAt: '2026-01-15T00:00:00.000Z',
  user: {
    id: 'u-001',
    fullName: 'Alice Smith',
    email: 'alice@test.com',
    profilePhoto: null,
    department: { id: 'd-001', name: 'Engineering' },
  },
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
          <Route path="/projects" element={<div>Projects List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockProjectsApi.getById.mockResolvedValue(mockProject);
  mockProjectsApi.listMembers.mockResolvedValue([mockMember]);
});

// UTC-F-008-FE-001
it('ProjectDetailPage_LoadsProject_DisplaysProjectInfo', async () => {
  renderPage();
  expect(await screen.findByText('Alpha Mobile App')).toBeInTheDocument();
  expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  expect(screen.getByText('Engineering')).toBeInTheDocument();
});

// UTC-F-008-FE-002
it('ProjectDetailPage_LoadsMembers_DisplaysMemberList', async () => {
  renderPage();
  expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
  expect(screen.getByText('alice@test.com')).toBeInTheDocument();
});

// UTC-F-008-FE-003
it('ProjectDetailPage_AdminRole_ShowsAddMemberButton', async () => {
  renderPage('ADMIN');
  expect(await screen.findByText('Alpha Mobile App')).toBeInTheDocument();
  expect(screen.getByText('Add Member')).toBeInTheDocument();
});

// UTC-F-008-FE-004
it('ProjectDetailPage_ViewerRole_HidesAddMemberButton', async () => {
  renderPage('EMPLOYEE');
  expect(await screen.findByText('Alpha Mobile App')).toBeInTheDocument();
  expect(screen.queryByText('Add Member')).not.toBeInTheDocument();
});

// UTC-F-008-FE-005
it('ProjectDetailPage_AddMember_OpensModal', async () => {
  renderPage();
  await screen.findByText('Alpha Mobile App');
  fireEvent.click(screen.getByText('Add Member'));
  expect(await screen.findByText('Add Team Member')).toBeInTheDocument();
});

// UTC-F-008-FE-006
it('ProjectDetailPage_BackLink_NavigatesToProjects', async () => {
  renderPage();
  await screen.findByText('Alpha Mobile App');
  fireEvent.click(screen.getByText('Back to Projects'));
  expect(await screen.findByText('Projects List')).toBeInTheDocument();
});
