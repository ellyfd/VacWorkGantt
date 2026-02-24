import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X } from 'lucide-react';

export default function FilterBar({
  departments,
  projects,
  groups,
  selectedDeptId,
  onDeptChange,
  selectedBrandIds,
  onBrandChange,
  hideHolidays,
  onHideHolidaysChange,
  visibleRowCount,
  totalRowCount,
}) {
  // 儲存篩選到 localStorage
  React.useEffect(() => {
    localStorage.setItem(
      'gantt-filters',
      JSON.stringify({
        deptId: selectedDeptId,
        brandIds: selectedBrandIds,
        hideHolidays,
      })
    );
  }, [selectedDeptId, selectedBrandIds, hideHolidays]);

  const DEPT_OPTIONS = [
    { value: null, label: '全部' },
    { value: 'makalot', label: '數位產品發展中心' },
    { value: 'dpc', label: 'DPC' },
  ];

  const getSelectedDeptName = () => {
    const option = DEPT_OPTIONS.find(o => o.value === selectedDeptId);
    return option ? option.label : '全部';
  };

  const getSelectedBrandNames = () => {
    return selectedBrandIds
      .map(id => {
        const proj = projects.find(p => p.id === id);
        return proj?.short_name || proj?.name || '';
      })
      .filter(Boolean);
  };

  const isFiltered = selectedDeptId || selectedBrandIds.length > 0;

  return (
    <div className="space-y-2">
      {/* 篩選控制列 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 部門篩選（chip 群組）*/}
        <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-md">
          <span className="text-xs text-gray-600 font-medium">部門：</span>
          <div className="flex items-center gap-1">
            {!selectedDeptId ? (
              <span className="text-xs text-gray-700 font-medium">全部</span>
            ) : (
              <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                <span className="text-xs font-medium">{getSelectedDeptName()}</span>
                <button
                  onClick={() => onDeptChange(null)}
                  className="hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          {/* 部門下拉選單 */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium ml-1">
                切換
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              {DEPT_OPTIONS.map(option => (
                <button
                  key={option.value || 'all'}
                  onClick={() => onDeptChange(option.value)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                    selectedDeptId === option.value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* 品牌篩選（tag）*/}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                selectedBrandIds.length > 0
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              品牌
              {selectedBrandIds.length > 0 && (
                <span className="bg-white text-violet-700 rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                  {selectedBrandIds.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-semibold text-gray-600">選擇品牌</span>
              {selectedBrandIds.length > 0 && (
                <button
                  onClick={() => onBrandChange([])}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  清除
                </button>
              )}
            </div>
            <div className="space-y-1">
              {projects.map(p => (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                    selectedBrandIds.includes(p.id) ? 'bg-violet-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedBrandIds.includes(p.id)}
                    onChange={(e) =>
                      onBrandChange(
                        e.target.checked
                          ? [...selectedBrandIds, p.id]
                          : selectedBrandIds.filter(id => id !== p.id)
                      )
                    }
                    className="w-3.5 h-3.5 accent-violet-600"
                  />
                  <span className="text-sm">{p.short_name || p.name}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* 假日隱藏切換 */}
        <button
          onClick={() => onHideHolidaysChange(!hideHolidays)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            hideHolidays
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {hideHolidays ? '✓ 隱藏假日' : '顯示假日'}
        </button>

        {/* 篩選提示 */}
        {isFiltered && (
          <div className="ml-auto text-xs text-gray-600">
            顯示 <span className="font-semibold text-gray-900">{visibleRowCount}</span> / <span className="font-semibold text-gray-900">{totalRowCount}</span> 個專案
          </div>
        )}
      </div>

      {/* 已選品牌 tags */}
      {selectedBrandIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {getSelectedBrandNames().map((name, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-xs"
            >
              {name}
              <button
                onClick={() => onBrandChange(selectedBrandIds.filter((_, i) => i !== idx))}
                className="hover:text-violet-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}