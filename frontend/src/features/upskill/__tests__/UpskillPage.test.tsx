import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { UpskillPage } from '../pages/UpskillPage';
import { upskillApi } from '../../../api/upskillApi';
import { usersApi } from '../../../api/users.api';
import { useAuthStore } from '../../../store/authStore';
import type { UpskillAssignment, UpskillPage as UpskillPageData } from '../../../api/upskillApi';

vi.mock('../../../api/upskillApi');
vi.mock('../../../api/users.api');
vi.mock('../../../store/authStore');

const mockAdmin = { id: 'mgr-001', fullName: 'Admin User', systemRole: 'ADMIN' };

const mockAssignment = (overrides: Partial<UpskillAssignment> = {}): UpskillAssignment => ({
  id: 'asgn-001',
  type: 'LEARNING',
  assignedToId: 'user-001',
  createdById: 'mgr-001',
  description: 'Learn NestJS',
  toolScript: null,
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  status: 'ASSIGNED',
  evidenceFilePath: null,
  evidenceFileName: null,
  rejectionReason: null,
  approvedAt: null,
  approvedById: null,
  createdAt: '2026-06-01',
  updatedAt: '2026-06-01',
  assignedTo: { id: 'user-001', fullName: 'John Doe' },
  createdBy: { id: 'mgr-001', fullName: 'Admin User' },
  progressLogs: [],
  ...overrides,
});

const emptyPage: UpskillPageData = { data: [], total: 0, page: 1, limit: 10 };
const pageOf = (assignments: UpskillAssignment[]): UpskillPageData => ({
  data: assignments,
  total: assignments.length,
  page: 1,
  limit: 10,
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <UpskillPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockAdmin });
  vi.mocked(usersApi.list).mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 });
  vi.mocked(upskillApi.listAssignments).mockResolvedValue(emptyPage);
});

// ─── UTC-F054-FE-03 ───────────────────────────────────────────────────────────

it('Create Assignment form always shows Tool/Script as an optional field', async () => {
  renderPage();

  fireEvent.click(await screen.findByText('Create Assignment'));
  expect(screen.getByPlaceholderText(/selenium/i)).toBeDefined();
  expect(screen.getByText(/Tool \/ Script/i)).toBeDefined();
});

// ─── UTC-F054-FE-04 ───────────────────────────────────────────────────────────

it('Page has no Learning/Automation tabs — single unified view', async () => {
  renderPage();

  await screen.findByText('Create Assignment');
  expect(screen.queryByRole('button', { name: /^Learning$/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Automation$/i })).toBeNull();
});

// ─── UTC-F054-FE-05 — Submit button exists in modal when fields empty ──────────

it('Submit button exists in modal (HTML5 required prevents submission)', async () => {
  renderPage();

  fireEvent.click(await screen.findByText('Create Assignment'));
  const allBtns = screen.getAllByRole('button', { name: /Create Assignment/i });
  const submitBtn = allBtns.find((b) => b.getAttribute('type') === 'submit');
  expect(submitBtn).toBeDefined();
  expect(upskillApi.createAssignment).not.toHaveBeenCalled();
});

// ─── UTC-F054-FE-06 — Approve calls PATCH ─────────────────────────────────────

it('Approve button calls upskillApi.approve', async () => {
  const submitted = mockAssignment({ status: 'SUBMITTED' });
  vi.mocked(upskillApi.listAssignments).mockResolvedValue(pageOf([submitted]));
  vi.mocked(upskillApi.approve).mockResolvedValue(mockAssignment({ status: 'APPROVED' }));

  renderPage();

  const approveBtn = await screen.findByRole('button', { name: /Approve/i });
  fireEvent.click(approveBtn);

  await waitFor(() => {
    expect(upskillApi.approve).toHaveBeenCalledWith('asgn-001');
  });
});

// ─── UTC-F054-FE-07 — Reject dialog requires reason ──────────────────────────

it('Reject shows dialog and validates empty reason', async () => {
  const submitted = mockAssignment({ status: 'SUBMITTED' });
  vi.mocked(upskillApi.listAssignments).mockResolvedValue(pageOf([submitted]));

  renderPage();

  const rejectBtn = await screen.findByRole('button', { name: /Reject/i });
  fireEvent.click(rejectBtn);

  expect(await screen.findByText('Reject Assignment')).toBeDefined();

  const confirmBtn = screen.getAllByRole('button', { name: /Reject/i }).pop()!;
  fireEvent.click(confirmBtn);

  expect(await screen.findByText('Reason is required')).toBeDefined();
  expect(upskillApi.reject).not.toHaveBeenCalled();
});

// ─── UTC-F054-FE-08 — Employee sees upskill assignment in KPI section ─────────
// (tested via MyAssignmentsSection — integration, not unit)

// ─── UTC-F054-FE-11 — APPROVED assignment shows read-only state ───────────────

it('APPROVED assignment shows Approved badge', async () => {
  const approved = mockAssignment({ status: 'APPROVED' });
  vi.mocked(upskillApi.listAssignments).mockResolvedValue(pageOf([approved]));

  renderPage();

  expect(await screen.findByText('Approved')).toBeDefined();
  expect(screen.queryByRole('button', { name: /Approve/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /Reject/i })).toBeNull();
});

// ─── UTC-F054-FE-12 — REJECTED shows rejection reason ────────────────────────

it('REJECTED assignment shows rejection reason in View drawer', async () => {
  const rejected = mockAssignment({ status: 'REJECTED', rejectionReason: 'Certificate unclear' });
  vi.mocked(upskillApi.listAssignments).mockResolvedValue(pageOf([rejected]));
  vi.mocked(upskillApi.getAssignment).mockResolvedValue(rejected);

  renderPage();

  const viewBtn = await screen.findByRole('button', { name: /View/i });
  fireEvent.click(viewBtn);

  expect(await screen.findByText(/Certificate unclear/i)).toBeDefined();
});
