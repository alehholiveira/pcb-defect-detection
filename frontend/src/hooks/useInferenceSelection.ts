import { useState, useCallback, useMemo } from 'react';
import type { InferenceFilters } from '../types/inference';
import type { GenerateReportRequest, GenerateReportFilters } from '../types/report';

export type SelectionMode = 'none' | 'individual' | 'all';

export interface UseInferenceSelectionReturn {
  selectionMode: SelectionMode;
  selectedIds: Set<number>;
  excludedIds: Set<number>;
  isSelected: (id: number) => boolean;
  toggleSelect: (id: number) => void;
  toggleSelectAll: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  selectionCount: number;
  clearSelection: () => void;
  getRequestPayload: (reportName: string, filters: InferenceFilters) => GenerateReportRequest;
}

export function useInferenceSelection(totalInferencesFiltered: number): UseInferenceSelectionReturn {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());

  const isSelected = useCallback((id: number) => {
    if (selectionMode === 'all') {
      return !excludedIds.has(id);
    }
    return selectedIds.has(id);
  }, [selectionMode, selectedIds, excludedIds]);

  const toggleSelect = useCallback((id: number) => {
    if (selectionMode === 'all') {
      setExcludedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        
        // If we excluded everything, switch back to none
        if (next.size === totalInferencesFiltered && totalInferencesFiltered > 0) {
          setSelectionMode('none');
          return new Set();
        }
        
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        
        if (next.size === 0) {
          setSelectionMode('none');
        } else if (selectionMode === 'none') {
          setSelectionMode('individual');
        }
        
        // If we individually selected everything, switch to all
        if (next.size === totalInferencesFiltered && totalInferencesFiltered > 0) {
          setSelectionMode('all');
          setExcludedIds(new Set());
          return new Set();
        }
        
        return next;
      });
    }
  }, [selectionMode, totalInferencesFiltered]);

  const toggleSelectAll = useCallback(() => {
    if (selectionMode === 'all') {
      setSelectionMode('none');
      setExcludedIds(new Set());
      setSelectedIds(new Set());
    } else {
      setSelectionMode('all');
      setExcludedIds(new Set());
      setSelectedIds(new Set());
    }
  }, [selectionMode]);

  const clearSelection = useCallback(() => {
    setSelectionMode('none');
    setSelectedIds(new Set());
    setExcludedIds(new Set());
  }, []);

  const isAllSelected = selectionMode === 'all' && excludedIds.size === 0;
  
  const isIndeterminate = useMemo(() => {
    if (selectionMode === 'individual' && selectedIds.size > 0) return true;
    if (selectionMode === 'all' && excludedIds.size > 0) return true;
    return false;
  }, [selectionMode, selectedIds, excludedIds]);

  const selectionCount = useMemo(() => {
    if (selectionMode === 'all') {
      return totalInferencesFiltered - excludedIds.size;
    }
    return selectedIds.size;
  }, [selectionMode, totalInferencesFiltered, excludedIds, selectedIds]);

  const getRequestPayload = useCallback((reportName: string, filters: InferenceFilters): GenerateReportRequest => {
    if (selectionMode === 'individual') {
      return {
        reportName,
        selectedIds: Array.from(selectedIds)
      };
    }
    
    // Convert current UI filters to API format
    const apiFilters: GenerateReportFilters = {};
    if (filters.startDate) apiFilters.startDate = filters.startDate;
    if (filters.endDate) apiFilters.endDate = filters.endDate;
    if (filters.modelName) apiFilters.modelName = filters.modelName;
    if (filters.defectType) apiFilters.defectType = filters.defectType;
    
    if (selectionMode === 'all') {
      return {
        reportName,
        filters: apiFilters,
        ...(excludedIds.size > 0 ? { excludedIds: Array.from(excludedIds) } : {})
      };
    }
    
    // Fallback (shouldn't happen if button is disabled)
    return { reportName, selectedIds: [] };
  }, [selectionMode, selectedIds, excludedIds]);

  return {
    selectionMode,
    selectedIds,
    excludedIds,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    isAllSelected,
    isIndeterminate,
    selectionCount,
    clearSelection,
    getRequestPayload
  };
}
