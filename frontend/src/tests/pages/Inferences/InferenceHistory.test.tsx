import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InferenceHistory } from '../../../pages/Inferences/InferenceHistory';
import { mockInferences } from '../../mocks/handlers';
import { NotificationProvider } from '../../../contexts/NotificationContext';

describe('InferenceHistory Component Integration Tests', () => {
  const defaultFilters = { page: 1, limit: 10 };
  const mockHistoryData = {
    data: mockInferences as any,
    meta: {
      total: mockInferences.length,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  };

  const defaultProps = {
    historyData: mockHistoryData,
    historyFilters: defaultFilters,
    historyLoading: false,
    onFiltersChange: vi.fn(),
    onFetchHistory: vi.fn(),
    onReplayInference: vi.fn(),
  };

  const renderComponent = (props = defaultProps) => {
    return render(
      <NotificationProvider>
        <InferenceHistory {...props} />
      </NotificationProvider>
    );
  };

  it('should render table rows with inference data correctly', () => {
    renderComponent();

    // Check table headers or inference data
    expect(screen.getByText('INF-1')).toBeInTheDocument();
    expect(screen.getByText('INF-2')).toBeInTheDocument();
  });

  it('should trigger onFiltersChange when applying filters', async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();

    renderComponent({ ...defaultProps, onFiltersChange });

    // Click apply filters button
    const applyButton = screen.getByRole('button', { name: /apply|filtrar|aplicar/i });
    await user.click(applyButton);

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('should display empty state message when historyData is empty', () => {
    renderComponent({
      ...defaultProps,
      historyData: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } },
    });

    expect(screen.queryByText('INF-1')).not.toBeInTheDocument();
  });
});
