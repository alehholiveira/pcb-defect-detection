import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useInferenceSelection } from '../../../hooks/useInferenceSelection';

describe('useInferenceSelection Hook Unit Tests', () => {
  it('should initialize with empty selection state', () => {
    const { result } = renderHook(() => useInferenceSelection(10));
    expect(result.current.selectionMode).toBe('none');
    expect(result.current.selectionCount).toBe(0);
    expect(result.current.isSelected(1)).toBe(false);
  });

  it('should toggle individual selection correctly', () => {
    const { result } = renderHook(() => useInferenceSelection(10));

    act(() => {
      result.current.toggleSelect(1);
    });

    expect(result.current.selectionMode).toBe('individual');
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.selectionCount).toBe(1);

    act(() => {
      result.current.toggleSelect(1);
    });

    expect(result.current.isSelected(1)).toBe(false);
    expect(result.current.selectionCount).toBe(0);
  });

  it('should toggle select all mode and handle exclusions', () => {
    const { result } = renderHook(() => useInferenceSelection(5));

    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selectionMode).toBe('all');
    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.selectionCount).toBe(5);

    // Exclude item 2
    act(() => {
      result.current.toggleSelect(2);
    });

    expect(result.current.isSelected(2)).toBe(false);
    expect(result.current.selectionCount).toBe(4);
    expect(result.current.isIndeterminate).toBe(true);
  });

  it('should clear selection state', () => {
    const { result } = renderHook(() => useInferenceSelection(10));

    act(() => {
      result.current.toggleSelect(1);
      result.current.clearSelection();
    });

    expect(result.current.selectionMode).toBe('none');
    expect(result.current.selectionCount).toBe(0);
  });
});
