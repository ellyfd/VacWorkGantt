import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function FilterRow({
  departments,
  selectedDeptId,
  onSelectDept,
  projects,
  selectedBrandIds,
  onSelectBrand,
  onClearAllFilters,
}) {
  const hasFilters = selectedDeptId || selectedBrandIds.length > 0;
  const selectedBrandNames = projects
    .filter(p => selectedBrandIds.includes(p.id))
    .map(p => p.short_name || p.name);

  return (
    <div className="space-y-3 border-b border-gray-200 pb-3">
      {/* 篩選提示 */}
      {hasFilters && (
        <div className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1.5 flex items-center justify-between">
          <span className="text-amber-700 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            篩選中：顯示 {0} / {0} 個專案
          </span>
          {hasFilters && (
            <button
              onClick={onClearAllFilters}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium underline"
            >
              清除全部
            </button>
          )}
        </div>
      )}

      {/* 部門篩選列 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-600 w-12">部門</span>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onSelectDept(null)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
              !selectedDeptId
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {departments.map(dept => (
            <button
              key={dept.id}
              onClick={() => onSelectDept(selectedDeptId === dept.id ? null : dept.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                selectedDeptId === dept.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {dept.short_name || dept.name}
            </button>
          ))}
        </div>
      </div>

      {/* 品牌篩選列 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-600 w-12">品牌</span>
        <div className="flex flex-wrap items-center gap-1">
          {/* 已選中的品牌 (tag 格式) */}
          {selectedBrandNames.map((name) => (
            <div
              key={name}
              className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full text-xs font-medium"
            >
              <span>{name}</span>
              <button
                onClick={() => {
                  const brandId = projects.find(p => (p.short_name || p.name) === name)?.id;
                  if (brandId) {
                    onSelectBrand(prev => prev.filter(id => id !== brandId));
                  }
                }}
                className="hover:opacity-70 transition-opacity"
                title="移除"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* 新增品牌選擇 popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                <Plus className="w-3 h-3" />
                <span>新增</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-semibold text-gray-600">選擇品牌</span>
                {selectedBrandIds.length > 0 && (
                  <button
                    onClick={() => onSelectBrand([])}
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
                        onSelectBrand(prev =>
                          e.target.checked
                            ? [...prev, p.id]
                            : prev.filter(id => id !== p.id)
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
        </div>
      </div>
    </div>
  );
}