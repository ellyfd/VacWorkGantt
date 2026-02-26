import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Edit2, Plus, Trash2 } from 'lucide-react';

export default function MobileGanttView({
  ganttProjects,
  ganttTasks,
  holidays,
  hideHolidays,
  selectedProjectId,
  onSelectProject,
  onEditProject,
  onDeleteProject,
  onAddTask,
}) {
  const [viewMonth, setViewMonth] = useState(new Date());

  // 計算月份的工作日
  const monthDays = useMemo(() => {
    const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
    const allDays = eachDayOfInterval({ start, end });
    const holidaySet = new Set(holidays.map(h => h.date));

    if (hideHolidays) {
      return allDays.filter(d => {
        const dow = getDay(d);
        const isWeekend = dow === 0 || dow === 6;
        const isHoliday = holidaySet.has(format(d, 'yyyy-MM-dd'));
        return !isWeekend && !isHoliday;
      });
    }
    return allDays;
  }, [viewMonth, holidays, hideHolidays]);

  // 取得選中的 project 和其 tasks
  const selectedProject = ganttProjects.find(p => p.id === selectedProjectId);
  const projectTasks = selectedProject 
    ? ganttTasks.filter(t => t.gantt_project_id === selectedProject.id)
    : [];

  const getTaskPosition = (task) => {
    if (!task.start_date) return null;
    const startDate = new Date(task.start_date);
    const dayIndex = monthDays.findIndex(d => 
      format(d, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd')
    );
    return dayIndex >= 0 ? dayIndex : null;
  };

  const getContrastColor = (hexColor) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#1f2937' : '#ffffff';
  };

  return (
    <div className="space-y-4">
      {/* Project 選擇卡片列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-4">
          <h2 className="font-semibold text-gray-900">開發季</h2>
          <Button size="sm" variant="outline" onClick={() => onAddTask?.()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 px-4">
          {ganttProjects.map(project => (
            <div
              key={project.id}
              onClick={() => onSelectProject?.(project.id)}
              className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                selectedProjectId === project.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              style={{
                backgroundColor: selectedProjectId === project.id ? undefined : project.color + '15',
                borderColor: selectedProjectId === project.id ? project.color : undefined,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 truncate">
                    {project.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    任務: {projectTasks.length}
                  </div>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProject?.(project);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject?.(project.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 時間軸 - 月視圖 */}
      {selectedProject && (
        <Card className="p-4">
          {/* 月份導航 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="p-1.5 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-sm text-gray-900">
              {format(viewMonth, 'yyyy年M月', { locale: zhTW })}
            </span>
            <button
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="p-1.5 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 週標題 */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} className="text-xs font-semibold text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* 日期網格 */}
          <div className="space-y-3">
            {Array.from({ length: Math.ceil(monthDays.length / 7) }).map((_, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const dayIndex = weekIdx * 7 + dayIdx;
                  const day = monthDays[dayIndex];
                  if (!day) {
                    return <div key={`empty-${dayIdx}`} className="aspect-square" />;
                  }

                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dow = getDay(day);
                  const isWeekend = dow === 0 || dow === 6;
                  const isTodayDate = isToday(day);
                  const task = projectTasks.find(t => 
                    t.start_date && format(new Date(t.start_date), 'yyyy-MM-dd') === dateStr
                  );

                  return (
                    <div
                      key={dateStr}
                      className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                        task
                          ? 'text-white border-2'
                          : isTodayDate
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : isWeekend
                          ? 'bg-gray-100 text-gray-500 border border-gray-200'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: task ? selectedProject.color : undefined,
                        borderColor: task ? selectedProject.color : undefined,
                      }}
                      title={task ? task.name : format(day, 'd日')}
                    >
                      {task ? '●' : format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 任務列表 */}
          {projectTasks.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">任務</h3>
              <div className="space-y-2">
                {projectTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-2 rounded bg-gray-50 border border-gray-200"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: selectedProject.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {task.time_type === 'milestone' && task.start_date && (
                            `里程碑 • ${format(new Date(task.start_date), 'M/d')}`
                          )}
                          {task.time_type === 'duration' && task.start_date && task.end_date && (
                            `${format(new Date(task.start_date), 'M/d')} - ${format(new Date(task.end_date), 'M/d')}`
                          )}
                          {task.time_type === 'rolling' && task.start_date && (
                            `Rolling • 從 ${format(new Date(task.start_date), 'M/d')} 開始`
                          )}
                          {!task.start_date && '無日期'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}