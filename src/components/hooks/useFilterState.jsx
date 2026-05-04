import { useState, useEffect } from 'react';

export function useFilterState() {
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedGroupSlug, setSelectedGroupSlug] = useState(null);
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [hideHolidays, setHideHolidays] = useState(true);
  const [archivedFilter, setArchivedFilter] = useState('active');

  // 从 localStorage 恢复筛选状态
  useEffect(() => {
    const saved = localStorage.getItem('gantt-filters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        if (filters.deptId) setSelectedDeptId(filters.deptId);
        if (filters.groupSlug) setSelectedGroupSlug(filters.groupSlug);
        if (filters.brandIds?.length > 0) setSelectedBrandIds(filters.brandIds);
        if (filters.hideHolidays !== undefined) {
          setHideHolidays(filters.hideHolidays);
        }
        if (filters.archivedFilter) setArchivedFilter(filters.archivedFilter);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const clearFilters = () => {
    setSelectedDeptId(null);
    setSelectedGroupSlug(null);
    setSelectedBrandIds([]);
    setHideHolidays(false);
    setArchivedFilter('active');
    localStorage.removeItem('gantt-filters');
  };

  return {
    selectedDeptId, setSelectedDeptId,
    selectedGroupSlug, setSelectedGroupSlug,
    selectedBrandIds, setSelectedBrandIds,
    hideHolidays, setHideHolidays,
    archivedFilter, setArchivedFilter,
    clearFilters,
  };
}
