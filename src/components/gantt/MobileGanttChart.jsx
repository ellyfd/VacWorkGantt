import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { format, addDays, subDays, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const CELL_WIDTH = 45;
const ROW_HEIGHT = 50;

export default function MobileGanttChart() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeProjectIdx, setActiveProjectIdx] = useState(0);

  // Fetch data
  const { data: ganttProjects = [] } = useQuery({
    queryKey: ['ganttProjects'],
    queryFn: () => base44.entities.GanttProject.list('sort_order'),
  });

  const { data: ganttTasks = [] } = useQuery({
    queryKey: ['ganttTasks'],
    queryFn: () => base44.entities.GanttTask.list('sort_order'),
  });

  const queryStart = format(subDays(currentDate, 7), 'yyyy-MM-dd');
  const queryEnd = format(addDays(currentDate, 7), 'yyyy-MM-dd');

  const { data: leaveRecords = [] } = useQuery({
    queryKey: ['leaveRecords', queryStart, queryEnd],
    queryFn: async () => {
      return base44.entities.LeaveRecord.filter({
        date: { $gte: queryStart, $lte: queryEnd }
      });
    },
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  // 當週 7 天
  const weekDays = useMemo(() => {
    const start = subDays(currentDate, getDay(currentDate) - 1);
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  // Holiday set
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  // 該周最大請假人數
  const maxLeaveCount = useMemo(() => {
    let max = 0;
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const count = new Set(leaveRecords.filter(r => r.date === dateStr).map(r => r.employee_id)).size;
      max = Math.max(max, count);
    });
    return max;
  }, [weekDays, leaveRecords]);

  const activeProject = ganttProjects[activeProjectIdx];
  const projectTasks = activeProject 
    ? ganttTasks.filter(t => t.gantt_project_id === activeProject.id && t.start_date) 
    : [];

  // 取得該 task 在週視圖中的位置和寬度
  const getTaskPosition = (task) => {
    const taskStart = new Date(task.start_date);
    const taskEnd = task.end_date ? new Date(task.end_date) : taskStart;
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];

    if (taskEnd < weekStart || taskStart > weekEnd) return null;

    const displayStart = taskStart < weekStart ? weekStart : taskStart;
    const displayEnd = taskEnd > weekEnd ? weekEnd : taskEnd;

    const startIdx = weekDays.findIndex(d => 
      format(d, 'yyyy-MM-dd') === format(displayStart, 'yyyy-MM-dd')
    );
    const endIdx = weekDays.findIndex(d => 
      format(d, 'yyyy-MM-dd') === format(displayEnd, 'yyyy-MM-dd')
    );

    if (startIdx < 0) return null;

    return {
      left: startIdx * CELL_WIDTH,
      width: Math.max((endIdx - startIdx + 1) * CELL_WIDTH - 2, CELL_WIDTH),
      startIdx,
      endIdx,
    };
  };

  const getLeaveCount = (dateStr) => {
    return new Set(leaveRecords.filter(r => r.date === dateStr).map(r => r.employee_id)).size;
  };

  return (
    <div className="md:hidden p-3 space-y-4 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-gray-900">甘特圖 - 週視圖</h1>
        <div className="flex items-center justify-between text-sm">
          <button onClick={() => setCurrentDate(d => subDays(d, 7))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium">{format(weekDays[0], 'M月d日')} - {format(weekDays[6], 'M月d日')}</span>
          <button onClick={() => setCurrentDate(d => addDays(d, 7))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Project Tabs */}
      {ganttProjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ganttProjects.map((proj, idx) => (
            <button
              key={proj.id}
              onClick={() => setActiveProjectIdx(idx)}
              className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                activeProjectIdx === idx
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {proj.name}
            </button>
          ))}
        </div>
      )}

      {/* 請假峰值 */}
      {maxLeaveCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
          本周請假峰值：<span className="font-bold">{maxLeaveCount} 人</span>
        </div>
      )}

      {activeProject ? (
        <Card className="overflow-hidden">
          {/* 週期 header */}
          <div className="flex bg-gray-100 border-b border-gray-200">
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isHoliday = holidaySet.has(dateStr);
              const isWeekend = getDay(day) === 0 || getDay(day) === 6;
              const isDim = isWeekend || isHoliday;
              
              return (
                <div
                  key={dateStr}
                  className={`flex-1 flex flex-col items-center justify-center py-2 border-r border-gray-200 text-xs ${
                    isToday(day) ? 'bg-red-100' : isDim ? 'bg-gray-50' : ''
                  }`}
                  style={{ width: CELL_WIDTH }}
                >
                  <span className={`font-bold ${isToday(day) ? 'text-red-700' : isDim ? 'text-gray-400' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                  <span className={`text-[10px] ${isDim ? 'text-gray-300' : 'text-gray-500'}`}>
                    {format(day, 'EEE', { locale: zhTW })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Task rows */}
          <div className="space-y-0 divide-y divide-gray-200">
            {projectTasks.length > 0 ? (
              projectTasks.map(task => {
                const pos = getTaskPosition(task);
                if (!pos) return null;

                return (
                  <div key={task.id} className="relative" style={{ height: ROW_HEIGHT }}>
                    {/* Background grid */}
                    <div className="absolute inset-0 flex">
                      {weekDays.map((day, idx) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isHoliday = holidaySet.has(dateStr);
                        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                        return (
                          <div
                            key={idx}
                            className={`flex-1 border-r border-gray-100 ${
                              isWeekend || isHoliday ? 'bg-gray-50' : 'bg-white'
                            }`}
                            style={{ width: CELL_WIDTH }}
                          />
                        );
                      })}
                    </div>

                    {/* Task bar */}
                    {pos && (
                      <div
                        className="absolute top-1 rounded bg-blue-500 text-white text-xs overflow-hidden flex items-center px-1 cursor-pointer hover:bg-blue-600"
                        style={{
                          left: pos.left + 1,
                          width: pos.width,
                          height: ROW_HEIGHT - 4,
                        }}
                        title={task.name}
                      >
                        <span className="truncate font-medium">{task.name}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-gray-400 text-sm">無任務</div>
            )}
          </div>

          {/* 請假人數列 */}
          <div className="bg-gray-50 border-t border-gray-200 p-2">
            <div className="text-xs font-medium text-gray-600 mb-2">請假人數</div>
            <div className="flex gap-1">
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const count = getLeaveCount(dateStr);
                return (
                  <div key={dateStr} className="flex-1 text-center">
                    {count > 0 && (
                      <span className="inline-block bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ) : (
        <div className="p-8 text-center text-gray-400">
          <p>建立新專案開始</p>
        </div>
      )}
    </div>
  );
}