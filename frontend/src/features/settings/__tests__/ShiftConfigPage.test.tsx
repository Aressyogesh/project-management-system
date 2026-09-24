import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ShiftConfigPage } from '../pages/ShiftConfigPage';
import { settingsApi } from '../../../api/settings.api';

vi.mock('../../../api/settings.api', () => ({
  settingsApi: {
    getShifts: vi.fn(),
    updateShift: vi.fn(),
  },
}));

const mockShifts = [
  { id: 'shift-1', name: 'Day',       shiftType: 'DAY',       startTime: '10:00', endTime: '19:00', workHours: 8, isActive: true },
  { id: 'shift-2', name: 'Afternoon', shiftType: 'AFTERNOON',  startTime: '15:00', endTime: '00:00', workHours: 8, isActive: true },
  { id: 'shift-3', name: 'Night',     shiftType: 'NIGHT',      startTime: '23:00', endTime: '08:00', workHours: 8, isActive: true },
];

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ShiftConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (settingsApi.getShifts as ReturnType<typeof vi.fn>).mockResolvedValue(mockShifts);
  });

  it('ShiftConfigPage_LoadsShifts_RendersThreeRows', async () => {
    renderWithQuery(<ShiftConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('DAY')).toBeInTheDocument();
      expect(screen.getByText('AFTERNOON')).toBeInTheDocument();
      expect(screen.getByText('NIGHT')).toBeInTheDocument();
    });
  });

  it('ShiftConfigPage_Loading_ShowsSkeleton', () => {
    (settingsApi.getShifts as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { container } = renderWithQuery(<ShiftConfigPage />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('ShiftConfigPage_ApiError_ShowsErrorMessage', async () => {
    (settingsApi.getShifts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    renderWithQuery(<ShiftConfigPage />);

    await waitFor(() => {
      expect(screen.getByText(/Could not load shifts/i)).toBeInTheDocument();
    });
  });

  it('ShiftConfigPage_SaveButton_DisabledWhenNothingChanged', async () => {
    renderWithQuery(<ShiftConfigPage />);

    await waitFor(() => screen.getByText('DAY'));

    const saveButtons = screen.getAllByText('Save');
    saveButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('ShiftConfigPage_ChangeTime_EnablesSaveButton', async () => {
    renderWithQuery(<ShiftConfigPage />);

    await waitFor(() => screen.getByText('DAY'));

    const timeInputs = screen.getAllByDisplayValue('10:00');
    fireEvent.change(timeInputs[0], { target: { value: '09:00' } });

    const saveButtons = screen.getAllByText('Save');
    expect(saveButtons[0]).not.toBeDisabled();
  });

  it('ShiftConfigPage_ClickSave_CallsUpdateShiftMutation', async () => {
    (settingsApi.updateShift as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockShifts[0], startTime: '09:00' });
    renderWithQuery(<ShiftConfigPage />);

    await waitFor(() => screen.getByText('DAY'));

    const timeInputs = screen.getAllByDisplayValue('10:00');
    fireEvent.change(timeInputs[0], { target: { value: '09:00' } });

    const saveButtons = screen.getAllByText('Save');
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(settingsApi.updateShift).toHaveBeenCalledWith('shift-1', expect.objectContaining({ startTime: '09:00' }));
    });
  });

  it('ShiftConfigPage_ResetAllButton_Rendered', async () => {
    renderWithQuery(<ShiftConfigPage />);
    await waitFor(() => screen.getByText('DAY'));
    expect(screen.getByText('Reset All to Default')).toBeInTheDocument();
  });
});
