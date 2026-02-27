import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const ROW_HEIGHT = 28;
const LABEL_WIDTH = 55;
// 10 工作天，動態根據螢幕寬度計算，最小 26px，最大 40px
const SCREEN_W = typeof window !== 'undefined' ? Math.min(window.innerWidth, 430) : 390;
const CELL_WIDTH = Math.floor(Math.min(Math.max((SCREEN_W - LABEL_WIDTH - 16) / 10, 26), 40));

export default function MobileGanttChart() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedGroupSlug, setSelectedGroupSlug] = useState('');
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskStartDate, setEditTaskStartDate] = useState('');
  const [editTaskEndDate, setEditTaskEndDate] = useState('');
  const queryClient = useQueryClient();

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

  // 雙週區間（只顯示週一~週五，共 10 天）
  const weekDays = useMemo(() => {
    // anchor: 2025-12-29 (週一)，純本地時間，避免UTC偏移
    const cy = currentDate.getFullYear();
    const cm = currentDate.getMonth();
    const cd = currentDate.getDate();
    const todayLocal = new Date(cy, cm, cd, 12, 0, 0);
    const anchorLocal = new Date(2025, 11, 29, 12, 0, 0); // 2025-12-29
    const diffMs = todayLocal.getTime() - anchorLocal.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const periodIndex = Math.floor(diffDays / 14);
    const startMs = anchorLocal.getTime() + periodIndex * 14 * 24 * 60 * 60 * 1000;
    const startDate = new Date(startMs);
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const allDays = eachDayOfInterval({ start, end: addDays(start, 13) });
    return allDays.filter(d => getDay(d) >= 1 && getDay(d) <= 5);
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

  // 有任務的品牌（不限本週，所有有 task 的品牌都顯示），依照品牌 sort_order 排列
  const brandsWithTasks = useMemo(() => {
    const brandIds = new Set(filteredTasks.map(t => {
      const proj = filteredProjects.find(p => p.id === t.gantt_project_id);
      return proj?.brand_id;
    }).filter(Boolean));
    return projects.filter(p => brandIds.has(p.id)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [filteredTasks, filteredProjects, projects]);

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

  // 取得該 task 在週視圖中的位置和寬度（只算工作日欄）
  const getTaskPosition = (task) => {
    const taskStart = new Date(task.start_date + 'T00:00:00');
    const taskEnd = task.end_date ? new Date(task.end_date + 'T00:00:00') : taskStart;
    const weekStart = weekDays[0];
    const weekEnd = weekDays[weekDays.length - 1];

    if (taskEnd < weekStart || taskStart > weekEnd) return null;

    const displayStart = taskStart < weekStart ? weekStart : taskStart;
    const displayEnd = taskEnd > weekEnd ? weekEnd : taskEnd;

    const startIdx = weekDays.findIndex(d => 
      format(d, 'yyyy-MM-dd') === format(displayStart, 'yyyy-MM-dd')
    );
    // If displayStart falls on a weekend, find the nearest next weekday in our list
    let resolvedStartIdx = startIdx;
    if (resolvedStartIdx < 0) {
      // find first weekday on or after displayStart
      const ds = format(displayStart, 'yyyy-MM-dd');
      resolvedStartIdx = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') >= ds);
      if (resolvedStartIdx < 0) return null;
    }

    let endIdx = weekDays.findIndex(d => 
      format(d, 'yyyy-MM-dd') === format(displayEnd, 'yyyy-MM-dd')
    );
    if (endIdx < 0) {
      // find last weekday on or before displayEnd
      const de = format(displayEnd, 'yyyy-MM-dd');
      for (let i = weekDays.length - 1; i >= 0; i--) {
        if (format(weekDays[i], 'yyyy-MM-dd') <= de) { endIdx = i; break; }
      }
    }
    if (endIdx < 0) endIdx = resolvedStartIdx;

    return {
      left: resolvedStartIdx * CELL_WIDTH,
      width: Math.max((endIdx - resolvedStartIdx + 1) * CELL_WIDTH - 2, CELL_WIDTH - 2),
      startIdx: resolvedStartIdx,
      endIdx,
    };
  };

  const getProjectColor = (ganttProject) => {
    const brand = projects.find(p => p.id === ganttProject.brand_id);
    return brand?.default_color || ganttProject.color || '#3b82f6';
  };

  const getContrastColor = (hexColor) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#1f2937' : '#ffffff';
  };

  const normalizeDate = (dateStr) => {
    if (!dateStr) return null;
    return dateStr.split('T')[0];
  };

  const calculateWorkingDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);
    if (!start || !end) return 0;
    
    let count = 0;
    const current = new Date(start);
    const endDate2 = new Date(end);
    while (current <= endDate2) {
      const dayOfWeek = getDay(current);
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = format(current, 'yyyy-MM-dd');
        if (!holidaySet.has(dateStr)) count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
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

  const getLeaveCountStyle = (count) => {
    if (!count) return null;
    if (count <= 2) return { bg: '#fef9c3', text: '#854d0e', label: `${count}人` };
    if (count <= 4) return { bg: '#ffedd5', text: '#9a3412', label: `${count}人` };
    return { bg: '#fee2e2', text: '#991b1b', label: `${count}人`, bold: true };
  };

  const updateTaskMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.GanttTask.update(editingTask.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttTasks']);
      setEditingTask(null);
    },
  });

  const handleEditTask = () => {
    if (editingTask) {
      updateTaskMutation.mutate({
        name: editTaskName,
        start_date: editTaskStartDate,
        end_date: editTaskEndDate || null,
      });
    }
  };

  const handleOpenEditDialog = (task) => {
    setEditingTask(task);
    setEditTaskName(task.name);
    setEditTaskStartDate(task.start_date);
    setEditTaskEndDate(task.end_date || '');
  };

  return (
    <div className="md:hidden p-3 space-y-3 pb-20">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900">專案甘特圖</h1>

      {/* 篩選 */}
      <div className="bg-gray-50 rounded p-2 space-y-1">
        {/* 集團篩選 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-gray-600 font-medium whitespace-nowrap">集團</div>
          <div className="flex flex-wrap gap-1">
            <Button
              variant={!selectedGroupSlug ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedGroupSlug('');
                setSelectedBrandIds([]);
              }}
              className="text-xs h-6 px-2"
            >
              全部
            </Button>
            {groups.map(g => (
              <Button
                key={g.id}
                variant={selectedGroupSlug === g.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedGroupSlug(g.id);
                  setSelectedBrandIds([]);
                }}
                className="text-xs h-6 px-2"
              >
                {g.name}
              </Button>
            ))}
          </div>
        </div>

        {/* 品牌篩選 */}
        {(() => {
          const usedBrandIds = new Set(ganttProjects.map(p => p.brand_id));
          const activeBrands = projects.filter(p => usedBrandIds.has(p.id));
          return (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[11px] text-gray-600 font-medium whitespace-nowrap">品牌</div>
                <div className="flex flex-wrap gap-1">
                  {activeBrands.map(p => (
                    <Button
                      key={p.id}
                      variant={selectedBrandIds.includes(p.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedBrandIds(prev =>
                        prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                      )}
                      className="text-xs h-6 px-2"
                    >
                      {p.short_name}
                    </Button>
                  ))}
                </div>
              </div>
              {selectedBrandIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBrandIds([])}
                  className="text-xs h-6 px-2 ml-12"
                >
                  <X className="w-3 h-3 mr-1" />
                  清除
                </Button>
              )}
            </div>
          );
        })()}
      </div>

      {/* 時間導航 */}
      <div className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded px-3 py-2">
        <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded">
          今天
        </button>
        <button onClick={() => setCurrentDate(d => subDays(d, 14))} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-medium">{format(weekDays[0], 'M月d日')} - {format(weekDays[weekDays.length - 1], 'M月d日')}</span>
        <button onClick={() => setCurrentDate(d => addDays(d, 14))} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {filteredTasks.length > 0 ? (
        <Card className="overflow-hidden w-fit max-w-full">
          {/* 週期 header + 請假人數 */}
          <div>
            {/* Header row with label column */}
            <div className="flex bg-gray-100 border-b border-gray-200">
              {/* 客戶 label header */}
              <div className="flex-shrink-0 flex items-center justify-center border-r border-gray-300 bg-gray-200 text-[10px] font-bold text-gray-600"
                style={{ width: LABEL_WIDTH }}>
                客戶
              </div>
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isHoliday = holidaySet.has(dateStr);
                const isDim = isHoliday;
                return (
                  <div
                    key={dateStr}
                    className={`flex flex-col items-center justify-center py-1 border-r border-gray-200 text-xs ${
                      isToday(day) ? 'bg-red-100' : isDim ? 'bg-gray-200' : ''
                    }`}
                    style={{ width: CELL_WIDTH, flexShrink: 0 }}
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

            {/* 請假人數列 */}
            <div className="flex bg-gray-50 border-b border-gray-200" style={{ height: 28 }}>
              {/* 請假 label col */}
              <div className="flex-shrink-0 border-r border-gray-300 flex items-center justify-center text-[9px] font-bold text-gray-500" style={{ width: LABEL_WIDTH }}>
                請假
              </div>
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const count = getLeaveCount(dateStr);
                const names = getLeaveNames(dateStr);
                const leaveStyle = getLeaveCountStyle(count);
                const cellContent = (
                  <div
                    key={dateStr}
                    className="flex-shrink-0 border-r border-gray-200 flex items-center justify-center text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: leaveStyle?.bg || 'transparent',
                      color: leaveStyle?.text || '#d1d5db',
                      fontWeight: leaveStyle?.bold ? 700 : 600,
                      width: CELL_WIDTH,
                    }}
                  >
                    {leaveStyle?.label || ''}
                  </div>
                );

                if (!count) return cellContent;

                return (
                  <Popover key={dateStr}>
                    <PopoverTrigger asChild>{cellContent}</PopoverTrigger>
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

          {/* Task rows — 每個品牌一排，所有品牌（有任務的）都固定顯示 */}
          <div className="space-y-0">
            {brandsWithTasks.map((brand) => {
              // 找這個品牌所有 tasks（不限本週）
              const brandProjects = filteredProjects.filter(p => p.brand_id === brand.id);
              const brandProjectIds = new Set(brandProjects.map(p => p.id));
              const brandTasks = filteredTasks.filter(t => brandProjectIds.has(t.gantt_project_id));

              // 只渲染本週有任務的 bar（但行固定存在）
              const thisWeekTasks = brandTasks.filter(t => getTaskPosition(t) !== null);

              // 取得該品牌所有季節（去重）
              const seasons = [...new Set(brandProjects.map(p => p.season))].filter(Boolean);

              return (
                <div key={brand.id} className="flex border-b border-gray-100" style={{ minHeight: ROW_HEIGHT }}>
                  {/* 客戶 label */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 leading-tight text-center px-0.5"
                    style={{ width: LABEL_WIDTH }}>
                    <div>{brand.short_name}</div>
                    {seasons.length > 0 && <div className="text-[9px] text-gray-500 mt-0.5">{seasons.join('/')}</div>}
                  </div>
                  {/* Grid + bars */}
                  <div className="relative" style={{ width: weekDays.length * CELL_WIDTH, minHeight: ROW_HEIGHT }}>
                    {/* Background grid */}
                    <div className="absolute inset-0 flex">
                      {weekDays.map((day, dayIdx) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isHoliday = holidaySet.has(dateStr);
                        return (
                          <div
                            key={dayIdx}
                            className={`flex-shrink-0 border-r border-gray-100 ${isHoliday ? 'bg-gray-200' : 'bg-white'}`}
                            style={{ width: CELL_WIDTH }}
                          />
                        );
                      })}
                    </div>

                    {/* Task bars — stack vertically if multiple */}
                    {thisWeekTasks.map((task, taskIdx) => {
                      const pos = getTaskPosition(task);
                      const proj = filteredProjects.find(p => p.id === task.gantt_project_id);
                      const color = proj ? getProjectColor(proj) : '#ccc';
                      const wd = task.time_type === 'duration' ? calculateWorkingDays(task.start_date, task.end_date) : 0;
                      const barText = [task.name, wd > 0 ? `(${wd}天)` : ''].filter(Boolean).join(' ');

                      return (
                        <div
                          key={task.id}
                          className="absolute rounded cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center overflow-hidden"
                          style={{
                            backgroundColor: color,
                            left: pos.left + 1,
                            width: pos.width,
                            height: ROW_HEIGHT - 6,
                            top: taskIdx * ROW_HEIGHT + 3,
                          }}
                          title={`${proj?.name} - ${task.name}`}
                          onClick={() => handleOpenEditDialog(task)}
                        >
                          <span className="font-medium text-[10px] px-1 text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: getContrastColor(color), maxWidth: '100%' }}>
                            {barText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="p-8 text-center text-gray-400 text-sm">
          篩選結果無任務
        </div>
      )}

      {/* 編輯任務對話框 */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md p-4 sm:p-5 gap-3 sm:gap-4 top-[30%] sm:top-auto">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-base">編輯任務</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium block mb-1">任務名稱</Label>
              <Input
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <div>
                  <Label className="text-xs font-medium block mb-1">開始日期</Label>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-full text-xs px-2 justify-start font-normal">
                      <CalendarIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{editTaskStartDate ? format(new Date(editTaskStartDate), 'M/d') : '選擇日期'}</span>
                    </Button>
                  </PopoverTrigger>
                </div>
                <PopoverContent className="w-auto p-2" align="start" side="top">
                  <Calendar
                    mode="single"
                    selected={editTaskStartDate ? new Date(editTaskStartDate) : undefined}
                    onSelect={(date) => setEditTaskStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                    disabled={(date) => date > (editTaskEndDate ? new Date(editTaskEndDate) : new Date('2099-12-31'))}
                    className="text-xs"
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <div>
                  <Label className="text-xs font-medium block mb-1">結束日期</Label>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-full text-xs px-2 justify-start font-normal">
                      <CalendarIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{editTaskEndDate ? format(new Date(editTaskEndDate), 'M/d') : '選擇日期'}</span>
                    </Button>
                  </PopoverTrigger>
                </div>
                <PopoverContent className="w-auto p-2" align="end" side="top">
                  <Calendar
                    mode="single"
                    selected={editTaskEndDate ? new Date(editTaskEndDate) : undefined}
                    onSelect={(date) => setEditTaskEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                    disabled={(date) => date < (editTaskStartDate ? new Date(editTaskStartDate) : new Date('2000-01-01'))}
                    className="text-xs"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex gap-2 pt-1 sm:pt-2">
            <Button variant="outline" onClick={() => setEditingTask(null)} className="h-8 text-sm flex-1">
              取消
            </Button>
            <Button onClick={handleEditTask} disabled={updateTaskMutation.isPending} className="h-8 text-sm flex-1">
              {updateTaskMutation.isPending ? '保存中' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}