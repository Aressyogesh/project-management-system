import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { projectsApi } from '../../../api/projects.api';
import { useAuthStore } from '../../../store/authStore';
import { ProjectsPage } from '../pages/ProjectsPage';

jest.mock('../../../api/projects.api');
jest.mock('../../../store/authStore');

const mockProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>;

const mockProject = {
  id: 'proj-001',
  name: 'Alpha Mobile App',
  description: 'A mobile application',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  budget: '500000',
  projectType: 'DEDICATED' as const,
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  client: { id: 'c-001', name: 'Acme Corp' },
  department: { id: 'd-001', name: 'Engineering' },
};

const mockSummary = {
  active: 1, archive: 0, onHold: 0,
  dedicated: 1, tAndM: 0, fixed: 0, overdue: 0,
};

function renderPage(role = 'SUPER_USER') {
  (useAuthStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ user: { systemRole: role } }),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockProjectsApi.list.mockResolvedValue([mockProject]);
  mockProjectsApi.summary.mockResolvedValue(mockSummary);
});

// UTC-F-007-FE-001
it('ProjectsPage_LoadsProjects_DisplaysProjectCards', async () => {
  renderPage();
  expect(await screen.findByText('Alpha Mobile App')).toBeInTheDocument();
  expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  expect(screen.getByText('Engineering')).toBeInTheDocument();
});

// UTC-F-007-FE-002
it('ProjectsPage_LoadsSummary_DisplaysSummaryCards', async () => {
  renderPage();
  await screen.findByText('Alpha Mobile App');
  expect(screen.getByText('Active')).toBeInTheDocument();
  expect(screen.getByText('Dedicated')).toBeInTheDocument();
});

// UTC-F-007-FE-003
it('ProjectsPage_EmptyState_ShowsNoProjMessage', async () => {
  mockProjectsApi.list.mockResolvedValue([]);
  mockProjectsApi.summary.mockResolvedValue({ active: 0, archive: 0, onHold: 0, dedicated: 0, tAndM: 0, fixed: 0, overdue: 0 });
  renderPage();
  expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
});

// UTC-F-007-FE-004
it('ProjectsPage_AdminRole_ShowsNewProjectButton', async () => {
  renderPage('ADMIN');
  await screen.findByText('Alpha Mobile App');
  expect(screen.getByText('New Project')).toBeInTheDocument();
});

// UTC-F-007-FE-005
it('ProjectsPage_ViewerRole_HidesNewProjectButton', async () => {
  renderPage('VIEWER');
  await screen.findByText('Alpha Mobile App');
  expect(screen.queryByText('New Project')).not.toBeInTheDocument();
});

// UTC-F-007-FE-006
it('ProjectsPage_NewProjectButton_OpensModal', async () => {
  renderPage();
  await screen.findByText('Alpha Mobile App');
  fireEvent.click(screen.getByText('New Project'));
  expect(await screen.findByText('Create Project')).toBeInTheDocument();
});

// UTC-F-007-FE-007
it('ProjectsPage_StatusFilter_CallsApiWithFilter', async () => {
  renderPage();
  await screen.findByText('Alpha Mobile App');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ARCHIVE' } });
  await waitFor(() =>
    expect(mockProjectsApi.list).toHaveBeenCalledWith({ status: 'ARCHIVE' }),
  );
});
