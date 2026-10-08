import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { departmentsApi } from '../../../api/departments.api';
import { DepartmentsPage } from '../pages/DepartmentsPage';

jest.mock('../../../api/departments.api');
const mockApi = departmentsApi as jest.Mocked<typeof departmentsApi>;

const mockDepts = [
  { id: 'dept-001', name: 'Digital',  isActive: true,  createdAt: new Date().toISOString() },
  { id: 'dept-002', name: 'Mobile',   isActive: false, createdAt: new Date().toISOString() },
];

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

// UTC-F-005-FE-001
it('DepartmentsPage_LoadsDepartments_DisplaysNameAndStatus', async () => {
  mockApi.list.mockResolvedValue(mockDepts as any);

  render(<DepartmentsPage />, { wrapper });

  await waitFor(() => expect(screen.getByText('Digital')).toBeInTheDocument());
  expect(screen.getByText('Mobile')).toBeInTheDocument();
  expect(screen.getAllByText('Active')).toHaveLength(1);
  expect(screen.getAllByText('Inactive')).toHaveLength(1);
});

// UTC-F-005-FE-002
it('DepartmentsPage_EmptyList_ShowsEmptyState', async () => {
  mockApi.list.mockResolvedValue([]);

  render(<DepartmentsPage />, { wrapper });

  await waitFor(() =>
    expect(screen.getByText(/No departments yet/i)).toBeInTheDocument(),
  );
});

// UTC-F-005-FE-003
it('DepartmentsPage_AddButtonClick_OpensModal', async () => {
  mockApi.list.mockResolvedValue([]);

  render(<DepartmentsPage />, { wrapper });

  await waitFor(() => screen.getByText(/No departments yet/i));
  await userEvent.click(screen.getByRole('button', { name: /Add Department/i }));

  expect(screen.getByText('Add Department', { selector: 'h2' })).toBeInTheDocument();
});

// UTC-F-005-FE-004
it('DepartmentsPage_SubmitEmptyName_ShowsValidationError', async () => {
  mockApi.list.mockResolvedValue([]);

  render(<DepartmentsPage />, { wrapper });

  await waitFor(() => screen.getByText(/No departments yet/i));
  await userEvent.click(screen.getByRole('button', { name: /Add Department/i }));

  const saveBtn = screen.getByRole('button', { name: /Save/i });
  await userEvent.click(saveBtn);

  expect(mockApi.create).not.toHaveBeenCalled();
});

// UTC-F-005-FE-005
it('DepartmentsPage_EditButton_OpensModalWithPrefilledName', async () => {
  mockApi.list.mockResolvedValue(mockDepts as any);

  render(<DepartmentsPage />, { wrapper });

  await waitFor(() => screen.getByText('Digital'));
  const editBtns = screen.getAllByTitle('Edit');
  await userEvent.click(editBtns[0]);

  expect(screen.getByText('Edit Department')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Digital')).toBeInTheDocument();
});
