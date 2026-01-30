import React from 'react';
import GanttBar from './GanttBar';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export default function GanttTimeline({ currentDate, clientGroups, brands, projects, phases, tasks, employees }) {
  // 生成該月的日期陣列
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    return format(date, 'yyyy-MM-dd');
  });

  // 周日標記
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const weekendIndices = days.map((day, idx) => {
    const date = new Date(day);
    return date.getDay();
  });

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? emp.name : '-';
  };

  return (
    <div className="flex-1 overflow-x-auto bg-gray-50">
      {/* 日期標題欄 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        {/* 日期數字 */}
        <div className="flex items-end">
          <div className="w-32 px-2 py-2 border-r border-gray-200 flex-shrink-0" />
          <div className="flex">
            {days.map((day, idx) => {
              const date = new Date(day);
              const dayName = dayNames[date.getDay()];
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div
                  key={day}
                  className={`flex flex-col items-center text-xs font-semibold ${
                    isWeekend ? 'bg-gray-100' : 'bg-white'
                  } border-r border-gray-200`}
                  style={{ width: '30px', padding: '4px' }}
                >
                  <div className="text-gray-600">{dayName}</div>
                  <div className={isWeekend ? 'text-gray-500' : 'text-gray-800'}>{date.getDate()}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 甘特圖內容 */}
      <div className="flex">
        {/* 左側項目名稱欄 */}
        <div className="bg-white border-r border-gray-200 flex-shrink-0" style={{ width: '300px' }}>
          <div className="max-h-96 overflow-y-auto">
            {phases.map((phase) => {
              const phaseTasks = tasks.filter(t => t.phase_id === phase.id);
              const project = projects.find(p => p.id === phase.project_id);
              const brand = brands.find(b => b.id === project?.brand_id);

              return (
                <div key={phase.id}>
                  <div className="px-4 py-2 bg-blue-50 border-b border-gray-200 text-sm font-semibold text-gray-800">
                    {brand?.name} - {phase.phase_type}
                  </div>
                  {phaseTasks.map((task) => (
                    <div key={task.id} className="px-4 py-2 border-b border-gray-200 text-xs text-gray-700 bg-white">
                      {task.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* 右側甘特條區域 */}
        <div className="flex flex-1">
          <div className="relative flex-1 bg-white" style={{ minWidth: `${days.length * 30}px` }}>
            {/* 背景網格 */}
            <div className="absolute inset-0 flex pointer-events-none">
              {days.map((day, idx) => {
                const date = new Date(day);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div
                    key={day}
                    className={`flex-shrink-0 border-r border-gray-200 ${isWeekend ? 'bg-gray-100' : 'bg-white'}`}
                    style={{ width: '30px' }}
                  />
                );
              })}
            </div>

            {/* 甘特條 */}
            <div className="relative">
              {phases.map((phase) => {
                const phaseTasks = tasks.filter(t => t.phase_id === phase.id);
                return (
                  <div key={phase.id}>
                    <div
                      className="relative bg-blue-50 border-b border-gray-200"
                      style={{ height: '40px', minWidth: `${days.length * 30}px` }}
                    >
                      {/* 階段層級的甘特條 */}
                      <GanttBar item={phase} days={days} />
                    </div>
                    {phaseTasks.map((task) => (
                      <div
                        key={task.id}
                        className="relative bg-white border-b border-gray-200"
                        style={{ height: '40px', minWidth: `${days.length * 30}px` }}
                      >
                        <GanttBar item={task} days={days} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 圖例 */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 transform rotate-45 rounded-sm" />
          <span>里程碑 (Milestone)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 bg-blue-400 rounded" />
          <span>時間區間 (Duration)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-3 rounded"
            style={{
              background: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 10px, #fbbf24 10px, #fbbf24 20px)',
            }}
          />
          <span>滾動 (Rolling)</span>
        </div>
      </div>
    </div>
  );
}