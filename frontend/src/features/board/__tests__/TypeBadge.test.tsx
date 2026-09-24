import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypeBadge } from '../components/TypeBadge';

describe('TypeBadge', () => {
  it('renders Epic with purple colour', () => {
    render(<TypeBadge type="EPIC" />);
    const badge = screen.getByText('Epic');
    expect(badge).toHaveClass('bg-purple-100');
    expect(badge).toHaveClass('text-purple-700');
  });

  it('renders Story with blue colour', () => {
    render(<TypeBadge type="USER_STORY" />);
    const badge = screen.getByText('Story');
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('renders Task with green colour', () => {
    render(<TypeBadge type="TASK" />);
    const badge = screen.getByText('Task');
    expect(badge).toHaveClass('bg-emerald-100');
  });

  it('renders Sub Task with cyan colour', () => {
    render(<TypeBadge type="SUB_TASK" />);
    const badge = screen.getByText('Sub Task');
    expect(badge).toHaveClass('bg-cyan-100');
  });

  it('renders Bug with red colour', () => {
    render(<TypeBadge type="BUG" />);
    const badge = screen.getByText('Bug');
    expect(badge).toHaveClass('bg-red-100');
    expect(badge).toHaveClass('text-red-700');
  });

  it('accepts additional className', () => {
    render(<TypeBadge type="TASK" className="my-custom-class" />);
    expect(screen.getByText('Task')).toHaveClass('my-custom-class');
  });
});
