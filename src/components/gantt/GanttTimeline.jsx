import React from 'react';
import { format } from 'date-fns';
import GanttBar from './GanttBar';

export default function GanttTimeline({
  days,
  holidays,
  projects,
  phases,
  tasks,
  expandedProjects,
  expandedPhases,
  onBarClick,
  filterText = ''
}) {
  const isHoliday = (date) => {
    return holidays?.some(h => h.date === date);
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  // 篩選專案
  const filteredProjects = filterText
    ? projects.filter(p => 
        p.name?.toLowerCase().includes(filterText.toLowerCase()) ||
        p.brand_name?.toLowerCase().includes(filterText.toLowerCase())
      )
    : projects;

  // 建立時間軸列表
  const rows = [];
  filteredProjects.forEach((project) => {
    rows.push({ type: 'project', data: project });
    
    if (expandedProjects[project.id]) {
      const projectPhases = phases.filter(p => p.project_id === project.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      
      projectPhases.forEach((phase) => {
        rows.push({ type: 'phase', data: phase });
        
        if (expandedPhases[phase.id]) {
          const phaseTasks = tasks.filter(t => t.phase_id === phase.id)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          
          phaseTasks.forEach((task) => {
            rows.push({ type: 'task', data: task });
          });
        }
      });
    }
  });

  return (
    <div className="flex-1 overflow-x-auto">
      {/* 日期標題 */}
      <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
        {days.map((d, idx) => (
          <div
            key={idx}
            className={`w-[28px] min-w-[28px] py-1 text-center text-xs border-r border-gray-200 ${
              d.isWeekend || isHoliday(d.date) ? 'bg-gray-200 text-red-500' : 
              d.date === today ? 'bg-blue-100 text-blue-600 font-bold' : 'text-gray-600'
            }`}
          >
            <div>{d.day}</div>
            <div className="text-[10px]">{d.weekday}</div>
          </div>
        ))}
      </div>

      {/* 時間軸內容 */}
      {rows.map((row, rowIdx) => (
        <div 
          key={`${row.type}-${row.data.id}`}
          className="flex border-b border-gray-100 h-9 relative"
        >
          {/* 日期格子背景 */}
          {days.map((d, idx) => (
            <div
              key={idx}
              className={`w-[28px] min-w-[28px] h-9 border-r border-gray-100 ${
                d.isWeekend || isHoliday(d.date) ? 'bg-gray-100' : 
                d.date === today ? 'bg-blue-50' : ''
              }`}
            />
          ))}

          {/* 甘特條 */}
          {(row.type === 'phase' || row.type === 'task') && (
            <GanttBar
              timeType={row.data.time_type}
              startDate={row.data.start_date}
              endDate={row.data.end_date}
              date={row.data.date}
              status={row.data.status}
              days={days}
              label={row.type === 'task' ? row.data.name : row.data.phase_type}
              onClick={() => onBarClick(row.data, row.type)}
            />
          )}
        </div>
      ))}

      {rows.length === 0 && (
        <div className="p-8 text-center text-gray-400">
          沒有資料
        </div>
      )}
    </div>
  );
}