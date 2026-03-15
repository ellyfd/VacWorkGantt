import React from 'react';

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
  visibleRowCount,
  totalRowCount,
}) {
  const filteredDepts = departments.filter(d => d.status !== 'hidden');
  const activeGroups = (groups || []).filter(g => g.status !== 'inactive');

  return (
    <div className="flex flex-col gap-2">

      {/* 第零行：集團 */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 whitespace-nowrap font-medium">集團</span>
        <div className="flex gap-1">
          <button
            onClick={() => onGroupChange(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              !selectedGroupSlug
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            全部
          </button>
          {activeGroups.map(group => (
            <button
              key={group.id}
              onClick={() => onGroupChange(selectedGroupSlug === group.id ? null : group.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedGroupSlug === group.id
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>

      {/* 第一行：部門 + 工作日 + 統計 + 清除篩選 */}
      <div className="flex items-center gap-3 flex-wrap">
        
        {/* 部門篩選 - Pill 風格 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 whitespace-nowrap font-medium">部門</span>
          <div className="flex gap-1">
            <button
              onClick={() => onDeptChange(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                !selectedDeptId
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            {filteredDepts.map(dept => (
              <button
                key={dept.id}
                onClick={() => onDeptChange(dept.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedDeptId === dept.id
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>

        {/* 分隔線 */}
        <div className="w-px h-4 bg-gray-300" />

        {/* 僅工作日 - Pill 風格 */}
        <button
          onClick={() => onHideHolidaysChange(!hideHolidays)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            hideHolidays
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {hideHolidays ? '✓ 僅工作日' : '僅工作日'}
        </button>

        {/* 篩選提示 */}
        <span className="text-xs text-gray-400 ml-1">
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
            className="text-xs text-red-400 hover:text-red-600 underline ml-auto"
          >
            清除篩選
          </button>
        )}
      </div>

      {/* 第二行：品牌 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-500 whitespace-nowrap font-medium">品牌</span>
        <button
          onClick={() => onBrandChange([])}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            selectedBrandIds.length === 0
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          全部
        </button>
        {projects.map(project => (
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
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedBrandIds.includes(project.id)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {project.short_name || project.name}
          </button>
        ))}
      </div>

    </div>
  );
});

export default FilterBar;