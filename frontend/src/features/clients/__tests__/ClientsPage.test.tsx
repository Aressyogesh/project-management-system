import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clientsApi } from '../../../api/clients.api';
import { ClientsPage } from '../pages/ClientsPage';

jest.mock('../../../api/clients.api');
const mockApi = clientsApi as jest.Mocked<typeof clientsApi>;

const mockClients = [
  { id: 'c-001', name: 'Acme Corp',  contactPerson: 'Jane', email: 'jane@acme.com', phone: null, address: null, isActive: true,  createdAt: new Date().toISOString() },
  { id: 'c-002', name: 'Beta Inc',   contactPerson: 'Bob',  email: 'bob@beta.com',  phone: null, address: null, isActive: false, createdAt: new Date().toISOString() },
];

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

// UTC-F-006-FE-001
it('ClientsPage_LoadsClients_DisplaysNameAndStatus', async () => {
  mockApi.list.mockResolvedValue(mockClients as any);

  render(<ClientsPage />, { wrapper });

  await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument());
  expect(screen.getByText('Beta Inc')).toBeInTheDocument();
  expect(screen.getAllByText('Active')).toHaveLength(1);
  expect(screen.getAllByText('Inactive')).toHaveLength(1);
});

// UTC-F-006-FE-002
it('ClientsPage_EmptyList_ShowsEmptyState', async () => {
  mockApi.list.mockResolvedValue([]);

  render(<ClientsPage />, { wrapper });

  await waitFor(() =>
    expect(screen.getByText(/No clients yet/i)).toBeInTheDocument(),
  );
});

// UTC-F-006-FE-003
it('ClientsPage_AddButtonClick_OpensModal', async () => {
  mockApi.list.mockResolvedValue([]);

  render(<ClientsPage />, { wrapper });

  await waitFor(() => screen.getByText(/No clients yet/i));
  await userEvent.click(screen.getByRole('button', { name: /Add Client/i }));

  expect(screen.getByText('Add Client', { selector: 'h2' })).toBeInTheDocument();
});

// UTC-F-006-FE-004
it('ClientsPage_SubmitEmptyName_DoesNotCallApi', async () => {
  mockApi.list.mockResolvedValue([]);

  render(<ClientsPage />, { wrapper });

  await waitFor(() => screen.getByText(/No clients yet/i));
  await userEvent.click(screen.getByRole('button', { name: /Add Client/i }));
  await userEvent.click(screen.getByRole('button', { name: /Save/i }));

  expect(mockApi.create).not.toHaveBeenCalled();
});

// UTC-F-006-FE-005
it('ClientsPage_EditButton_OpensModalWithPrefilledData', async () => {
  mockApi.list.mockResolvedValue(mockClients as any);

  render(<ClientsPage />, { wrapper });

  await waitFor(() => screen.getByText('Acme Corp'));
  const editBtns = screen.getAllByTitle('Edit');
  await userEvent.click(editBtns[0]);

  expect(screen.getByText('Edit Client')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
});
