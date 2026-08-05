import { render, screen, fireEvent } from '@testing-library/react';
import { TaskKanbanBoard } from '../components/TaskKanbanBoard';
import type { Task } from '../../../types/task.types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-001',
  title: 'Test Task',
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
  ...overrides,
});

const onTaskClick = jest.fn();

afterEach(() => jest.clearAllMocks());

// UTC-F-013-FE-001
it('Kanban_Renders_FourColumns', () => {
  render(<TaskKanbanBoard tasks={[]} onTaskClick={onTaskClick} />);
  expect(screen.getByText('Not Started')).toBeInTheDocument();
  expect(screen.getByText('In Progress')).toBeInTheDocument();
  expect(screen.getByText('On Review')).toBeInTheDocument();
  expect(screen.getByText('Completed')).toBeInTheDocument();
});

// UTC-F-013-FE-002
it('Kanban_ShowsTaskInCorrectColumn', () => {
  const task = makeTask({ status: 'IN_PROGRESS', title: 'Active Work' });
  render(<TaskKanbanBoard tasks={[task]} onTaskClick={onTaskClick} />);
  expect(screen.getByText('Active Work')).toBeInTheDocument();
});

// UTC-F-013-FE-003
it('Kanban_TaskCard_ShowsPriorityBadge', () => {
  const task = makeTask({ priority: 'HIGH' });
  render(<TaskKanbanBoard tasks={[task]} onTaskClick={onTaskClick} />);
  expect(screen.getByText('HIGH')).toBeInTheDocument();
});

// UTC-F-013-FE-004
it('Kanban_TaskCard_ClickCallsOnTaskClick', () => {
  const task = makeTask({ title: 'Clickable Task' });
  render(<TaskKanbanBoard tasks={[task]} onTaskClick={onTaskClick} />);
  fireEvent.click(screen.getByText('Clickable Task'));
  expect(onTaskClick).toHaveBeenCalledWith(task);
});

// UTC-F-013-FE-005
it('Kanban_EmptyColumn_ShowsNoTasksPlaceholder', () => {
  const task = makeTask({ status: 'NOT_STARTED' });
  render(<TaskKanbanBoard tasks={[task]} onTaskClick={onTaskClick} />);
  const noTasks = screen.getAllByText('No tasks');
  expect(noTasks).toHaveLength(3);
});
