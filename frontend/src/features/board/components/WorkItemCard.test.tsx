import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkItemCard } from './WorkItemCard';
import { WorkItem } from '../types/board.types';

vi.mock('@hello-pangea/dnd', () => ({
  Draggable: ({ children }: any) => children({ draggableProps: {}, dragHandleProps: {}, innerRef: vi.fn() }, {}),
}));

const baseItem: WorkItem = {
  id: 'item-1',
  displayId: 'HOR10001',
  projectId: 'proj-1',
  type: 'TASK' as any,
  status: 'TODO' as any,
  title: 'Fix login bug',
  priority: 'MEDIUM' as any,
  reporterId: 'user-1',
  labels: [],
  components: [],
};

describe('WorkItemCard', () => {
  it('renders displayId when provided', () => {
    render(<WorkItemCard item={baseItem} index={0} onClick={vi.fn()} />);
    expect(screen.getByText('HOR10001')).toBeInTheDocument();
  });

  it('renders item title', () => {
    render(<WorkItemCard item={baseItem} index={0} onClick={vi.fn()} />);
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('does not crash when displayId is undefined', () => {
    const noIdItem = { ...baseItem, displayId: undefined };
    render(<WorkItemCard item={noIdItem} index={0} onClick={vi.fn()} />);
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
