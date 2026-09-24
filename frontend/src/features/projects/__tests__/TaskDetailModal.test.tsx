import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { taskAttachmentsApi } from '../../../api/taskAttachments.api';
import { taskCommentsApi } from '../../../api/taskComments.api';
import { TaskDetailModal } from '../components/TaskDetailModal';
import type { Task } from '../../../types/task.types';

jest.mock('../../../api/taskAttachments.api');
jest.mock('../../../api/taskComments.api');

const mockAttachmentsApi = taskAttachmentsApi as jest.Mocked<typeof taskAttachmentsApi>;
const mockCommentsApi = taskCommentsApi as jest.Mocked<typeof taskCommentsApi>;

const mockTask: Task = {
  id: 'task-001',
  title: 'Implement login page',
  description: null,
  priority: 'MEDIUM',
  billingStatus: 'BILLABLE',
  status: 'NOT_STARTED',
  estimatedHours: null,
  startDate: null,
  dueDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  taskList: { id: 'tl-001', name: 'Sprint 1', type: 'SPRINT' },
  milestone: null,
  assignedTo: null,
  createdBy: { id: 'user-001', fullName: 'Admin User', profilePhoto: null },
};

const mockAttachment = {
  id: 'att-001',
  filename: 'uuid.pdf',
  originalName: 'report.pdf',
  mimeType: 'application/pdf',
  size: 12345,
  createdAt: '2026-01-01T00:00:00.000Z',
  uploadedBy: { id: 'user-001', fullName: 'Admin User' },
};

const mockComment = {
  id: 'cmt-001',
  content: 'Looks good!',
  createdAt: '2026-01-01T00:00:00.000Z',
  author: { id: 'user-001', fullName: 'Admin User' },
};

function renderModal(canEdit = true, currentUserId = 'user-001') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TaskDetailModal
        task={mockTask}
        onClose={jest.fn()}
        canEdit={canEdit}
        currentUserId={currentUserId}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAttachmentsApi.list.mockResolvedValue([mockAttachment]);
  mockCommentsApi.list.mockResolvedValue([mockComment]);
});

// UTC-F-012-FE-001
it('TaskDetail_DetailsTab_ShowsTaskInfo', () => {
  renderModal();
  expect(screen.getByText('Implement login page')).toBeInTheDocument();
  expect(screen.getByText('Status')).toBeInTheDocument();
  expect(screen.getByText('Priority')).toBeInTheDocument();
});

// UTC-F-012-FE-002
it('TaskDetail_AttachmentsTab_ShowsAttachmentsList', async () => {
  renderModal();
  fireEvent.click(screen.getByRole('button', { name: /attachments/i }));
  expect(await screen.findByText('report.pdf')).toBeInTheDocument();
});

// UTC-F-012-FE-003
it('TaskDetail_CommentsTab_ShowsCommentsList', async () => {
  renderModal();
  fireEvent.click(screen.getByRole('button', { name: /comments/i }));
  expect(await screen.findByText('Looks good!')).toBeInTheDocument();
});

// UTC-F-012-FE-004
it('TaskDetail_AdminRole_ShowsUploadButton', async () => {
  renderModal(true);
  fireEvent.click(screen.getByRole('button', { name: /attachments/i }));
  expect(await screen.findByText('Upload File')).toBeInTheDocument();
});

// UTC-F-012-FE-005
it('TaskDetail_EmployeeRole_HidesUploadButton', async () => {
  renderModal(false);
  fireEvent.click(screen.getByRole('button', { name: /attachments/i }));
  await screen.findByText('report.pdf');
  expect(screen.queryByText('Upload File')).not.toBeInTheDocument();
});
