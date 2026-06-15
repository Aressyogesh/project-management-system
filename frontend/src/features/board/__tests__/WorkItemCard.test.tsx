import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkItemCard } from '../components/WorkItemCard';
import type { WorkItem } from '../types/board.types';

vi.mock('@hello-pangea/dnd', () => ({
  Draggable: ({ children }: any) =>
    children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}));

const baseItem: WorkItem = {
  id: 'wi-1',
  projectId: 'p-1',
  type: 'TASK',
  status: 'TODO',
  title: 'Implement login',
  priority: 'HIGH',
  reporterId: 'u-1',
  reporter: { id: 'u-1', fullName: 'Alice' },
  reopenCount: 0,
  position: 0,
  labels: [],
  components: [],
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
};

describe('WorkItemCard', () => {
  it('renders type badge', () => {
    render(<WorkItemCard item={baseItem} index={0} onClick={vi.fn()} />);
    expect(screen.getByText('Task')).toBeInTheDocument();
  });

  it('renders priority badge', () => {
    render(<WorkItemCard item={baseItem} index={0} onClick={vi.fn()} />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<WorkItemCard item={baseItem} index={0} onClick={vi.fn()} />);
    expect(screen.getByText('Implement login')).toBeInTheDocument();
  });

  it('renders story points when set', () => {
    render(<WorkItemCard item={{ ...baseItem, storyPoints: 5 }} index={0} onClick={vi.fn()} />);
    expect(screen.getByText('5 pts')).toBeInTheDocument();
  });

  it('does not render story points when null', () => {
    render(<WorkItemCard item={{ ...baseItem, storyPoints: null }} index={0} onClick={vi.fn()} />);
    expect(screen.queryByText(/pts/)).not.toBeInTheDocument();
  });

  it('shows assignee initials when assigned', () => {
    render(
      <WorkItemCard
        item={{ ...baseItem, assignee: { id: 'u-2', fullName: 'Bob Smith' } }}
        index={0}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByTitle('Bob Smith')).toBeInTheDocument();
  });

  it('shows "Unassigned" when no assignee', () => {
    render(<WorkItemCard item={{ ...baseItem, assignee: null }} index={0} onClick={vi.fn()} />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('shows logged hours when timesheet entries exist', () => {
    render(
      <WorkItemCard
        item={{ ...baseItem, timesheetEntries: [{ id: 'te-1', workItemId: 'wi-1', userId: 'u-1', date: '2026-05-01', hours: 3.5, createdAt: '2026-05-01T00:00:00Z', user: { id: 'u-1', fullName: 'Alice' } }] }}
        index={0}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText('3.5h logged')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<WorkItemCard item={baseItem} index={0} onClick={handleClick} />);
    screen.getByText('Implement login').click();
    expect(handleClick).toHaveBeenCalledWith(baseItem);
  });

  it('renders Bug type badge in red', () => {
    render(<WorkItemCard item={{ ...baseItem, type: 'BUG' }} index={0} onClick={vi.fn()} />);
    const badge = screen.getByText('Bug');
    expect(badge).toHaveClass('bg-red-100');
  });

  it('renders Epic badge in purple', () => {
    render(<WorkItemCard item={{ ...baseItem, type: 'EPIC' }} index={0} onClick={vi.fn()} />);
    expect(screen.getByText('Epic')).toHaveClass('bg-purple-100');
  });
});
