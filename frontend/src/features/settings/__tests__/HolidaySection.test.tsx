import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HolidaySection } from '../components/HolidaySection';
import { settingsApi } from '../../../api/settings.api';

vi.mock('../../../api/settings.api', () => ({
  settingsApi: {
    getHolidays: vi.fn(),
    createHoliday: vi.fn(),
    deleteHoliday: vi.fn(),
  },
}));

const CURRENT_YEAR = new Date().getFullYear();

const mockHolidays = [
  { id: 'h-1', name: 'Republic Day',    date: `${CURRENT_YEAR}-01-26`, isRecurring: true },
  { id: 'h-2', name: 'Independence Day', date: `${CURRENT_YEAR}-08-15`, isRecurring: true },
];

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function getAddButton() {
  return screen.getByRole('button', { name: /Add Holiday/i });
}

describe('HolidaySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (settingsApi.getHolidays as ReturnType<typeof vi.fn>).mockResolvedValue(mockHolidays);
    (settingsApi.createHoliday as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'h-3', name: 'New Holiday', date: `${CURRENT_YEAR}-03-10`, isRecurring: false,
    });
    (settingsApi.deleteHoliday as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('HolidaySection_Loads_RendersHolidayList', async () => {
    renderWithQuery(<HolidaySection />);

    await waitFor(() => {
      expect(screen.getByText('Republic Day')).toBeInTheDocument();
      expect(screen.getByText('Independence Day')).toBeInTheDocument();
    });
  });

  it('HolidaySection_LoadsRecurring_ShowsRecurringBadges', async () => {
    renderWithQuery(<HolidaySection />);

    await waitFor(() => {
      const recurringBadges = screen.getAllByText('Recurring');
      expect(recurringBadges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('HolidaySection_YearSelector_RendersCurrentYear', async () => {
    renderWithQuery(<HolidaySection />);

    const select = await screen.findByDisplayValue(String(CURRENT_YEAR));
    expect(select).toBeInTheDocument();
  });

  it('HolidaySection_EmptyName_ShowsValidationError', async () => {
    renderWithQuery(<HolidaySection />);

    await waitFor(() => screen.getByText('Republic Day'));

    fireEvent.click(getAddButton());

    expect(screen.getByText('Holiday name is required')).toBeInTheDocument();
    expect(settingsApi.createHoliday).not.toHaveBeenCalled();
  });

  it('HolidaySection_NameWithoutDate_ShowsDateValidationError', async () => {
    renderWithQuery(<HolidaySection />);

    await waitFor(() => screen.getByText('Republic Day'));

    fireEvent.change(screen.getByPlaceholderText(/Holiday name/i), {
      target: { value: 'Test Holiday' },
    });

    fireEvent.click(getAddButton());

    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(settingsApi.createHoliday).not.toHaveBeenCalled();
  });

  it('HolidaySection_ValidInput_CallsCreateMutation', async () => {
    renderWithQuery(<HolidaySection />);

    await waitFor(() => screen.getByText('Republic Day'));

    fireEvent.change(screen.getByPlaceholderText(/Holiday name/i), {
      target: { value: 'New Holiday' },
    });

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: `${CURRENT_YEAR}-03-10` } });

    fireEvent.click(getAddButton());

    await waitFor(() => {
      expect(settingsApi.createHoliday).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Holiday', date: `${CURRENT_YEAR}-03-10` }),
      );
    });
  });

  it('HolidaySection_DeleteButton_OpensConfirmModal', async () => {
    renderWithQuery(<HolidaySection />);

    await waitFor(() => screen.getByText('Republic Day'));

    const deleteButtons = screen.getAllByTitle('Delete holiday');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Delete Holiday?')).toBeInTheDocument();
  });

  it('HolidaySection_ConfirmDelete_CallsDeleteMutation', async () => {
    renderWithQuery(<HolidaySection />);

    await waitFor(() => screen.getByText('Republic Day'));

    const deleteButtons = screen.getAllByTitle('Delete holiday');
    fireEvent.click(deleteButtons[0]);

    // Click the confirm button inside the modal
    const modal = screen.getByText('Delete Holiday?').closest('div.text-center') as HTMLElement;
    const confirmBtn = within(modal).getByRole('button', { name: /^Delete$/ });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(settingsApi.deleteHoliday).toHaveBeenCalledWith('h-1');
    });
  });

  it('HolidaySection_NoHolidays_ShowsEmptyMessage', async () => {
    (settingsApi.getHolidays as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderWithQuery(<HolidaySection />);

    await waitFor(() => {
      expect(screen.getByText(/No holidays for/i)).toBeInTheDocument();
    });
  });
});
