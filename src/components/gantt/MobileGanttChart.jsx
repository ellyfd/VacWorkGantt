import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays, subDays, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const CELL_WIDTH = 45;
const ROW_HEIGHT = 24;

export default function MobileGanttChart() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedGroupSlug, setSelectedGroupSlug] = useState('');
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);

  // Fetch data
  const { data: ganttProjects = [] } = useQuery({
    queryKey: ['ganttProjects'],
    queryFn: () => base44.entities.GanttProject.list('sort_order'),
  });

  const { data: ganttTasks = [] } = useQuery({
    queryKey: ['ganttTasks'],
    queryFn: () => base44.entities.GanttTask.list('sort_order'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('sort_order'),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list('sort_order'),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list(),
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

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('name'),
  });

  // 當週 7 天
  const weekDays = useMemo(() => {
    const start = subDays(currentDate, getDay(currentDate) - 1);
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  // Holiday set
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  // 篩選
  const filteredProjects = useMemo(() => {
    return ganttProjects.filter(proj => {
      if (selectedGroupSlug) {
        const brand = projects.find(p => p.id === proj.brand_id);
        if (brand?.group_id !== selectedGroupSlug) return false;
      }
      if (selectedBrandIds.length > 0 && !selectedBrandIds.includes(proj.brand_id)) return false;
      return true;
    });
  }, [ganttProjects, selectedGroupSlug, selectedBrandIds, projects]);

  // 篩選後的 tasks（所有匹配 project）
  const filteredTasks = useMemo(() => {
    const projectIds = new Set(filteredProjects.map(p => p.id));
    return ganttTasks.filter(t => t.start_date && projectIds.has(t.gantt_project_id));
  }, [ganttTasks, filteredProjects]);

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

  const getProjectColor = (ganttProject) => {
    const brand = projects.find(p => p.id === ganttProject.brand_id);
    return brand?.default_color || ganttProject.color || '#3b82f6';
  };

  const employeeMap = useMemo(() =>
    Object.fromEntries(employees.map(e => [e.id, e])), [employees]);

  const getLeaveCount = (dateStr) => {
    return new Set(leaveRecords.filter(r => r.date === dateStr).map(r => r.employee_id)).size;
  };

  const getLeaveNames = (dateStr) => {
    const records = leaveRecords.filter(r => r.date === dateStr);
    const names = new Map();
    records.forEach(r => {
      if (!names.has(r.employee_id)) {
        const name = employeeMap[r.employee_id]?.name || `未知員工(${r.employee_id.slice(0, 6)})`;
        names.set(r.employee_id, name);
      }
    });
    return Array.from(names.values());
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

      {/* 篩選 */}
      <div className="space-y-2">
        <Select value={selectedDeptId} onValueChange={(val) => {
          setSelectedDeptId(val);
          setSelectedGroupSlug(val ? departments.find(d => d.id === val)?.group_id : null);
          setSelectedBrandIds([]);
        }}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="選擇部門..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>全部</SelectItem>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedGroupSlug} onValueChange={(val) => {
          setSelectedGroupSlug(val || null);
          setSelectedBrandIds([]);
        }}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="選擇集團..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>全部</SelectItem>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 請假峰值 */}
      {maxLeaveCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
          本周請假峰值：<span className="font-bold">{maxLeaveCount} 人</span>
        </div>
      )}

      {filteredTasks.length > 0 ? (
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
                  <span className={`font-bold text-[11px] ${isToday(day) ? 'text-red-700' : isDim ? 'text-gray-400' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                  <span className={`text-[9px] ${isDim ? 'text-gray-300' : 'text-gray-500'}`}>
                    {format(day, 'EEE', { locale: zhTW })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Task rows (all projects stacked) */}
          <div className="space-y-0">
            {filteredTasks.map((task, idx) => {
              const pos = getTaskPosition(task);
              if (!pos) return null;
              const proj = filteredProjects.find(p => p.id === task.gantt_project_id);
              const color = proj ? getProjectColor(proj) : '#ccc';

              return (
                <div key={task.id} className="relative border-b border-gray-100" style={{ height: ROW_HEIGHT }}>
                  {/* Background grid */}
                  <div className="absolute inset-0 flex">
                    {weekDays.map((day, dayIdx) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const isHoliday = holidaySet.has(dateStr);
                      const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                      return (
                        <div
                          key={dayIdx}
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
                      className="absolute top-0.5 rounded text-white text-[10px] overflow-hidden flex items-center px-0.5 cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: color,
                        left: pos.left + 1,
                        width: pos.width,
                        height: ROW_HEIGHT - 2,
                      }}
                      title={`${proj?.name} - ${task.name}`}
                    >
                      <span className="truncate font-medium">{task.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 請假人數列 */}
          <div className="bg-gray-50 border-t border-gray-200 p-2">
            <div className="text-xs font-medium text-gray-600 mb-1">請假人數</div>
            <div className="flex gap-1">
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const count = getLeaveCount(dateStr);
                const names = getLeaveNames(dateStr);
                
                if (count === 0) {
                  return <div key={dateStr} className="flex-1" />;
                }

                return (
                  <Popover key={dateStr}>
                    <PopoverTrigger asChild>
                      <button className="flex-1 cursor-pointer hover:opacity-80">
                        <span className="inline-block bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {count}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-max p-2 text-xs" side="bottom" align="center">
                      {names.map((name, idx) => (
                        <p key={idx} className="text-gray-800 py-0.5 whitespace-nowrap">
                          {name}
                        </p>
                      ))}
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        </Card>
      ) : (
        <div className="p-8 text-center text-gray-400 text-sm">
          篩選結果無任務
        </div>
      )}
    </div>
  );
}