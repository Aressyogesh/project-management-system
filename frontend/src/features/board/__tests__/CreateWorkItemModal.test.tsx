import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateWorkItemModal } from '../components/WorkItemModal';
import { boardApi } from '../api/boardApi';

vi.mock('../api/boardApi', () => ({
  boardApi: {
    createWorkItem: vi.fn(),
    uploadAttachment: vi.fn(),
    getWorkItems: vi.fn().mockResolvedValue([]),
  },
}));

const mockCreateWorkItem = boardApi.createWorkItem as ReturnType<typeof vi.fn>;

const members = [{ id: 'u-1', fullName: 'Alice PM', projectRole: 'PROJECT_MANAGER' }];

function renderModal(overrides: Partial<React.ComponentProps<typeof CreateWorkItemModal>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CreateWorkItemModal
        projectId="p-1"
        sprints={[]}
        members={members}
        milestones={[]}
        defaultType="TASK"
        parentId="parent-1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onSuccess={vi.fn()}
        {...overrides}
      />
    </QueryClientProvider>,
  );
}

function labelInput() {
  return screen.getByPlaceholderText('Type a label and press Enter…');
}

function addLabel(text: string) {
  fireEvent.change(labelInput(), { target: { value: text } });
  fireEvent.keyDown(labelInput(), { key: 'Enter' });
}

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText('Work item title…'), { target: { value: 'My Task' } });
  fireEvent.change(screen.getByDisplayValue('Unassigned'), { target: { value: 'u-1' } });
  fireEvent.change(screen.getByDisplayValue('— select —'), { target: { value: 'BILLABLE' } });
  const estHoursInputs = screen.getAllByRole('spinbutton');
  fireEvent.change(estHoursInputs[estHoursInputs.length - 1], { target: { value: '4' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateWorkItem.mockResolvedValue({ id: 'wi-new', labels: [] });
});

describe('CreateWorkItemModal — Labels (F-081)', () => {
  // UTC-F081-F-001
  it('addPendingLabel_ValidText_AppendsChipAndClearsInput', () => {
    renderModal();
    addLabel('hotfix');
    expect(screen.getByText('hotfix')).toBeInTheDocument();
    expect((labelInput() as HTMLInputElement).value).toBe('');
  });

  // UTC-F081-F-002
  it('addPendingLabel_EmptyOrWhitespace_NoChipAdded', () => {
    renderModal();
    addLabel('   ');
    expect(screen.queryByText('   ')).not.toBeInTheDocument();
    // no chip container rendered at all when labels array stays empty
    expect(screen.queryByRole('button', { name: '×' })).not.toBeInTheDocument();
  });

  // UTC-F081-F-003
  it('addPendingLabel_DuplicateText_DoesNotAddSecondChip', () => {
    renderModal();
    addLabel('hotfix');
    addLabel('hotfix');
    expect(screen.getAllByText('hotfix')).toHaveLength(1);
  });

  // UTC-F081-F-004
  it('removePendingLabel_ClickChipX_RemovesOnlyThatChip', () => {
    renderModal();
    addLabel('hotfix');
    addLabel('tech-debt');
    const chips = screen.getAllByText('×');
    fireEvent.click(chips[0]);
    expect(screen.queryByText('hotfix')).not.toBeInTheDocument();
    expect(screen.getByText('tech-debt')).toBeInTheDocument();
  });

  // UTC-F081-F-005
  it('handleSubmit_WithLabels_IncludesLabelsArrayInCreatePayload', async () => {
    renderModal();
    fillRequiredFields();
    addLabel('hotfix');
    addLabel('urgent');

    fireEvent.click(screen.getByRole('button', { name: 'Create Item' }));

    await waitFor(() => expect(mockCreateWorkItem).toHaveBeenCalledTimes(1));
    const [, payload] = mockCreateWorkItem.mock.calls[0];
    expect(payload.labels).toEqual(['hotfix', 'urgent']);
  });

  // UTC-F081-F-006
  it('handleSubmit_NoLabelsAdded_OmitsLabelsField', async () => {
    renderModal();
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Create Item' }));

    await waitFor(() => expect(mockCreateWorkItem).toHaveBeenCalledTimes(1));
    const [, payload] = mockCreateWorkItem.mock.calls[0];
    expect(payload.labels).toBeUndefined();
  });

  // UTC-F081-F-007
  it('saveAndAddNew_AfterCreateWithLabels_ResetsLabelsField', async () => {
    renderModal();
    fillRequiredFields();
    addLabel('hotfix');

    fireEvent.click(screen.getByRole('button', { name: 'Save & Add New' }));

    await waitFor(() => expect(mockCreateWorkItem).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('hotfix')).not.toBeInTheDocument());
  });
});
