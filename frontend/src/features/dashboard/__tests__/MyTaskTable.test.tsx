import { render, screen } from '@testing-library/react';
import { MyTaskTable } from '../components/MyTaskTable';
import type { MyTask } from '../../../types/dashboard.types';

const makeTask = (overrides: Partial<MyTask> = {}): MyTask => ({
  id: 'task-001',
  projectName: 'Alpha Project',
  taskName: 'Fix login bug',
  assignee: 'Alice Smith',
  priority: 'MEDIUM',
  status: 'NOT_STARTED',
  ...overrides,
});

// UTC-F-014-FE-001
it('MyTaskTable_RendersTaskRowsWithProjectAndTaskName', () => {
  render(<MyTaskTable tasks={[makeTask(), makeTask({ id: 'task-002', projectName: 'Beta', taskName: 'Write tests' })]} />);
  expect(screen.getByText('Alpha Project')).toBeInTheDocument();
  expect(screen.getByText('Write tests')).toBeInTheDocument();
});

// UTC-F-014-FE-002
it('MyTaskTable_ShowsCriticalPriorityBadge', () => {
  render(<MyTaskTable tasks={[makeTask({ priority: 'CRITICAL' })]} />);
  expect(screen.getByText('critical')).toBeInTheDocument();
});

// UTC-F-014-FE-003
it('MyTaskTable_ShowsCompletedStatusBadge', () => {
  render(<MyTaskTable tasks={[makeTask({ status: 'COMPLETED' })]} />);
  expect(screen.getByText('Completed')).toBeInTheDocument();
});

// UTC-F-014-FE-004
it('MyTaskTable_ShowsEmptyStateWhenNoTasks', () => {
  render(<MyTaskTable tasks={[]} />);
  expect(screen.getByText('No tasks assigned yet')).toBeInTheDocument();
});
