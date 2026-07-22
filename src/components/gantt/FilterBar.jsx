import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FilterBar = React.memo(function FilterBar({
  departments,
  groups,
  projects,
  selectedDeptId,
  onDeptChange,
  selectedGroupSlug,
  onGroupChange,
  selectedBrandIds,
  onBrandChange,
  hideHolidays,
  onHideHolidaysChange,
  archivedFilter,
  onArchivedFilterChange,
  archivedCount,
  visibleRowCount,
  totalRowCount,
}) {
  const filteredDepts = departments.filter(d => d.status !== 'hidden');
  const activeGroups = (groups || []).filter(g => g.status !== 'inactive');
  const [showAllBrands, setShowAllBrands] = useState(false);
  const brandDisplayLimit = 12;
  const selectedBrands = projects.filter(project => selectedBrandIds.includes(project.id));
  const remainingBrands = projects.filter(project => !selectedBrandIds.includes(project.id));
  const collapsedBrands = [...selectedBrands, ...remainingBrands].slice(0, brandDisplayLimit);
  const visibleBrands = showAllBrands ? projects : collapsedBrands;
  const hasHiddenBrands = projects.length > brandDisplayLimit;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm flex flex-col gap-2.5">

      {/* 第零行：集團 */}
      <div className="flex items-start gap-2">
        <span className="w-10 pt-1.5 text-xs text-gray-500 whitespace-nowrap font-medium">集團</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onGroupChange(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              !selectedGroupSlug
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            全部
          </button>
          {activeGroups.map(group => (
            <button
              key={group.id}
              onClick={() => onGroupChange(selectedGroupSlug === group.id ? null : group.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                selectedGroupSlug === group.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>

      {/* 第一行：部門 + 工作日 + 統計 + 清除篩選 */}
      <div className="flex items-start gap-x-4 gap-y-2 flex-wrap">
        
        {/* 部門篩選 - Pill 風格 */}
        <div className="flex items-start gap-2">
          <span className="w-10 pt-1.5 text-xs text-gray-500 whitespace-nowrap font-medium">部門</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onDeptChange(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                !selectedDeptId
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            {filteredDepts.map(dept => (
              <button
                key={dept.id}
                onClick={() => onDeptChange(dept.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  selectedDeptId === dept.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>

        {/* 分隔線 */}
        <div className="hidden md:block w-px h-7 bg-gray-200" />

        {/* 僅工作日 - Pill 風格 */}
        <button
          onClick={() => onHideHolidaysChange(!hideHolidays)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            hideHolidays
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {hideHolidays ? '✓ 僅工作日' : '僅工作日'}
        </button>

        {/* 分隔線 */}
        <div className="hidden md:block w-px h-7 bg-gray-200" />

        {/* 歸檔狀態 - 三段式 Pill */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 whitespace-nowrap font-medium">狀態</span>
          <div className="flex gap-1">
            {[
              { value: 'active', label: '進行中' },
              { value: 'archived', label: `已歸檔${archivedCount ? ` (${archivedCount})` : ''}` },
              { value: 'all', label: '全部' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => onArchivedFilterChange(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  archivedFilter === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 篩選提示 */}
        <span className="text-xs text-gray-500 ml-auto pt-1.5 tabular-nums">
          顯示 {visibleRowCount} / {totalRowCount} 個專案
        </span>

        {/* 清除篩選（有篩選才顯示，靠右） */}
        {(selectedDeptId || selectedGroupSlug || selectedBrandIds.length > 0) && (
          <button
            onClick={() => { 
              onDeptChange(null);
              onGroupChange(null);
              onBrandChange([]); 
            }}
            className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 pt-1.5"
          >
            清除篩選
          </button>
        )}
      </div>

      {/* 第二行：品牌 */}
      <div className="flex items-start gap-2 flex-wrap border-t border-gray-100 pt-2.5">
        <span className="w-10 pt-1.5 text-xs text-gray-500 whitespace-nowrap font-medium">品牌</span>
        <button
          onClick={() => onBrandChange([])}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            selectedBrandIds.length === 0
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          全部
        </button>
        {visibleBrands.map(project => (
          <button
            key={project.id}
            onClick={() => {
              const id = project.id;
              onBrandChange(
                selectedBrandIds.includes(id)
                  ? selectedBrandIds.filter(b => b !== id)
                  : [...selectedBrandIds, id]
              );
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              selectedBrandIds.includes(project.id)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {project.short_name || project.name}
          </button>
        ))}
        {hasHiddenBrands && (
          <button
            type="button"
            onClick={() => setShowAllBrands(value => !value)}
            className="px-2 py-1 inline-flex items-center gap-1 rounded-full text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-expanded={showAllBrands}
          >
            {showAllBrands ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showAllBrands ? '收合品牌' : `顯示其餘 ${projects.length - collapsedBrands.length} 個`}
          </button>
        )}
      </div>

    </div>
  );
});

export default FilterBar;
