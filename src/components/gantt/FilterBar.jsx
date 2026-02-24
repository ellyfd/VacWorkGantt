import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function FilterBar({
  departments,
  projects,
  selectedDeptId,
  onDeptChange,
  selectedBrandIds,
  onBrandChange,
  hideHolidays,
  onHideHolidaysChange,
  visibleRowCount,
  totalRowCount,
}) {
  const hasFilters = selectedDeptId || selectedBrandIds.length > 0 || hideHolidays;

  // 篩選狀態持久化
  useEffect(() => {
    const filters = {
      deptId: selectedDeptId,
      brandIds: selectedBrandIds,
      hideHolidays,
    };
    localStorage.setItem('gantt-filters', JSON.stringify(filters));
  }, [selectedDeptId, selectedBrandIds, hideHolidays]);

  return (
    <div className="space-y-3 pb-3 border-b border-gray-200">
      {/* 篩選狀態提示 */}
      {hasFilters && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3" />
            <span>篩選中：顯示 <span className="font-semibold">{visibleRowCount}/{totalRowCount}</span> 個專案</span>
          </div>
          <button
            onClick={() => {
              onDeptChange(null);
              onBrandChange([]);
              onHideHolidaysChange(false);
            }}
            className="text-xs text-amber-600 hover:text-amber-700 underline"
          >
            清除全部
          </button>
        </div>
      )}

      {/* 篩選控制項 */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {/* 部門篩選 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 w-10">部門</span>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => onDeptChange(null)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                !selectedDeptId
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            {departments.map(dept => (
              <button
                key={dept.id}
                onClick={() => onDeptChange(selectedDeptId === dept.id ? null : dept.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  selectedDeptId === dept.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {dept.short_name || dept.name}
              </button>
            ))}
          </div>
        </div>

        {/* 品牌篩選 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 w-10">品牌</span>
          <div className="flex items-center gap-1.5">
            {selectedBrandIds.length === 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="px-3 py-1.5 rounded text-xs font-medium bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
                    全部
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="space-y-1">
                    {projects.map(p => (
                      <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedBrandIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onBrandChange([...selectedBrandIds, p.id]);
                            } else {
                              onBrandChange(selectedBrandIds.filter(id => id !== p.id));
                            }
                          }}
                          className="w-3.5 h-3.5"
                        />
                        <span className="text-sm">{p.short_name || p.name}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <>
                {selectedBrandIds.map(brandId => {
                  const brand = projects.find(p => p.id === brandId);
                  return (
                    <div
                      key={brandId}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium"
                    >
                      {brand?.short_name || brand?.name}
                      <button
                        onClick={() => onBrandChange(selectedBrandIds.filter(id => id !== brandId))}
                        className="text-blue-600 hover:text-blue-800 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="px-2.5 py-1 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                      + 新增
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="space-y-1">
                      {projects.map(p => (
                        <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedBrandIds.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onBrandChange([...selectedBrandIds, p.id]);
                              } else {
                                onBrandChange(selectedBrandIds.filter(id => id !== p.id));
                              }
                            }}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-sm">{p.short_name || p.name}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        </div>

        {/* 隱藏假日 */}
        <button
          onClick={() => onHideHolidaysChange(!hideHolidays)}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            hideHolidays
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {hideHolidays ? '✓ 隱藏假日' : '顯示假日'}
        </button>
      </div>
    </div>
  );
}