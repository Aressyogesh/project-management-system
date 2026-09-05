import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BoardToolbar } from '../components/BoardToolbar';
import type { Sprint } from '../types/board.types';

const sprints: Sprint[] = [
  { id: 's-1', projectId: 'p-1', name: 'Sprint 1', isActive: true, createdAt: '2026-05-01T00:00:00Z' },
  { id: 's-2', projectId: 'p-1', name: 'Sprint 2', isActive: false, createdAt: '2026-05-01T00:00:00Z' },
];

const members = [
  { id: 'u-1', fullName: 'Alice' },
  { id: 'u-2', fullName: 'Bob' },
];

describe('BoardToolbar', () => {
  it('renders sprint options', () => {
    render(
      <BoardToolbar
        sprints={sprints}
        filters={{}}
        onFiltersChange={vi.fn()}
        members={members}
        onCreateItem={vi.fn()}
        onManageSprints={vi.fn()}
        canManageSprints={true}
      />,
    );
    expect(screen.getByText('Sprint 1 ★')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
  });

  it('calls onFiltersChange when type changes', () => {
    const onChange = vi.fn();
    render(
      <BoardToolbar
        sprints={[]}
        filters={{}}
        onFiltersChange={onChange}
        members={[]}
        onCreateItem={vi.fn()}
        onManageSprints={vi.fn()}
        canManageSprints={false}
      />,
    );
    const typeSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(typeSelect, { target: { value: 'BUG' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'BUG' }));
  });

  it('calls onCreateItem when Create button clicked', () => {
    const onCreateItem = vi.fn();
    render(
      <BoardToolbar
        sprints={[]}
        filters={{}}
        onFiltersChange={vi.fn()}
        members={[]}
        onCreateItem={onCreateItem}
        onManageSprints={vi.fn()}
        canManageSprints={false}
      />,
    );
    screen.getByText('Create').click();
    expect(onCreateItem).toHaveBeenCalled();
  });

  it('shows Sprints button when canManageSprints=true', () => {
    render(
      <BoardToolbar
        sprints={[]}
        filters={{}}
        onFiltersChange={vi.fn()}
        members={[]}
        onCreateItem={vi.fn()}
        onManageSprints={vi.fn()}
        canManageSprints={true}
      />,
    );
    expect(screen.getByText('Sprints')).toBeInTheDocument();
  });

  it('hides Sprints button when canManageSprints=false', () => {
    render(
      <BoardToolbar
        sprints={[]}
        filters={{}}
        onFiltersChange={vi.fn()}
        members={[]}
        onCreateItem={vi.fn()}
        onManageSprints={vi.fn()}
        canManageSprints={false}
      />,
    );
    expect(screen.queryByText('Sprints')).not.toBeInTheDocument();
  });

  it('shows Clear button when filters are active', () => {
    render(
      <BoardToolbar
        sprints={[]}
        filters={{ type: 'BUG' }}
        onFiltersChange={vi.fn()}
        members={[]}
        onCreateItem={vi.fn()}
        onManageSprints={vi.fn()}
        canManageSprints={false}
      />,
    );
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('clears filters when Clear is clicked', () => {
    const onChange = vi.fn();
    render(
      <BoardToolbar
        sprints={[]}
        filters={{ type: 'BUG', search: 'login' }}
        onFiltersChange={onChange}
        members={[]}
        onCreateItem={vi.fn()}
        onManageSprints={vi.fn()}
        canManageSprints={false}
      />,
    );
    screen.getByText('Clear').click();
    expect(onChange).toHaveBeenCalledWith({});
  });
});
