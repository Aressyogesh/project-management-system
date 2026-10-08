import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KanbanColumn } from '../components/KanbanColumn';
import type { WorkItem } from '../types/board.types';

vi.mock('@hello-pangea/dnd', () => ({
  Droppable: ({ children }: any) =>
    children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
  Draggable: ({ children }: any) =>
    children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}));

const makeItem = (id: string, title: string): WorkItem => ({
  id,
  projectId: 'p-1',
  type: 'TASK',
  status: 'TODO',
  title,
  priority: 'MEDIUM',
  reporterId: 'u-1',
  reporter: { id: 'u-1', fullName: 'Alice' },
  reopenCount: 0,
  position: 0,
  labels: [],
  components: [],
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
});

describe('KanbanColumn', () => {
  it('renders column label', () => {
    render(
      <KanbanColumn
        status="TODO"
        label="To Do"
        headerClass="bg-gray-100 text-gray-700"
        items={[]}
        onCardClick={vi.fn()}
      />,
    );
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('shows item count badge', () => {
    const items = [makeItem('1', 'Task A'), makeItem('2', 'Task B')];
    render(
      <KanbanColumn
        status="TODO"
        label="To Do"
        headerClass="bg-gray-100 text-gray-700"
        items={items}
        onCardClick={vi.fn()}
      />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(
      <KanbanColumn
        status="TODO"
        label="To Do"
        headerClass="bg-gray-100 text-gray-700"
        items={[]}
        onCardClick={vi.fn()}
      />,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders work item cards when items exist', () => {
    const items = [makeItem('1', 'Fix bug'), makeItem('2', 'Add feature')];
    render(
      <KanbanColumn
        status="TODO"
        label="To Do"
        headerClass="bg-gray-100 text-gray-700"
        items={items}
        onCardClick={vi.fn()}
      />,
    );
    expect(screen.getByText('Fix bug')).toBeInTheDocument();
    expect(screen.getByText('Add feature')).toBeInTheDocument();
  });
});
