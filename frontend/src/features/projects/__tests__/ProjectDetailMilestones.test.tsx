import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { milestonesApi } from '../../../api/milestones.api';
import { projectsApi } from '../../../api/projects.api';
import { useAuthStore } from '../../../store/authStore';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';

jest.mock('../../../api/projects.api');
jest.mock('../../../api/milestones.api');
jest.mock('../../../api/users.api', () => ({
  usersApi: { list: jest.fn().mockResolvedValue({ data: [], total: 0 }) },
}));
jest.mock('../../../store/authStore');

const mockProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>;
const mockMilestonesApi = milestonesApi as jest.Mocked<typeof milestonesApi>;

const mockProject = {
  id: 'proj-001', name: 'Alpha Mobile App', description: null,
  startDate: null, endDate: null, budget: null,
  projectType: 'DEDICATED' as const, status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z', client: null, department: null,
};

const mockMilestone = {
  id: 'ms-001', description: 'Phase 1 Delivery', deliveryNote: null,
  startDate: null, dueDate: null, status: 'NOT_STARTED' as const,
  createdAt: '2026-01-01T00:00:00.000Z', responsibleUser: null,
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
  mockMilestonesApi.list.mockResolvedValue([mockMilestone]);
});

// UTC-F-009-FE-001
it('MilestonesSection_LoadsMilestones_DisplaysList', async () => {
  renderPage();
  expect(await screen.findByText('Phase 1 Delivery')).toBeInTheDocument();
});

// UTC-F-009-FE-002
it('MilestonesSection_EmptyState_ShowsNoMilestonesMsg', async () => {
  mockMilestonesApi.list.mockResolvedValue([]);
  renderPage();
  expect(await screen.findByText(/no milestones yet/i)).toBeInTheDocument();
});

// UTC-F-009-FE-003
it('MilestonesSection_AdminRole_ShowsAddButton', async () => {
  renderPage('ADMIN');
  expect(await screen.findByText('Phase 1 Delivery')).toBeInTheDocument();
  expect(screen.getByText('Add Milestone')).toBeInTheDocument();
});

// UTC-F-009-FE-004
it('MilestonesSection_ViewerRole_HidesAddButton', async () => {
  renderPage('EMPLOYEE');
  expect(await screen.findByText('Phase 1 Delivery')).toBeInTheDocument();
  expect(screen.queryByText('Add Milestone')).not.toBeInTheDocument();
});

// UTC-F-009-FE-005
it('MilestonesSection_AddButton_OpensModal', async () => {
  renderPage();
  await screen.findByText('Phase 1 Delivery');
  fireEvent.click(screen.getByText('Add Milestone'));
  expect(await screen.findByText('Add Milestone', { selector: 'h2' })).toBeInTheDocument();
});
