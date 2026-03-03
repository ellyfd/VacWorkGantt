import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { addDays, subDays, format, eachDayOfInterval, isToday, getDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import GanttRow from '@/components/gantt/GanttRow';
import AddProjectDialog from '@/components/gantt/AddProjectDialog';
import EditProjectDialog from '@/components/gantt/EditProjectDialog';
import AddTaskDialog from '@/components/gantt/AddTaskDialog';
import { MilestoneDialog, DurationDialog, RollingDialog } from '@/components/gantt/TimeDialogs';
import ImportScheduleDialog from '@/components/gantt/ImportScheduleDialog';
import TimeNavigation from '@/components/gantt/TimeNavigation';
import FilterBar from '@/components/gantt/FilterBar';
import { useSelectionState } from '@/components/hooks/useSelectionState';
import { useDragState } from '@/components/hooks/useDragState';
import { useDialogState } from '@/components/hooks/useDialogState';
import { useFormData } from '@/components/hooks/useFormData';
import { useFilterState } from '@/components/hooks/useFilterState';
import { useProjectCreation } from '@/components/hooks/useProjectCreation';

// 根據背景色決定文字要用深色或淺色
const getContrastColor = (hexColor) => {
  if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1f2937' : '#ffffff';
};

// 產生同色系淺色（用於 Rolling 延伸段）
const getLightColor = (hexColor) => {
  if (!hexColor || !hexColor.startsWith('#')) return '#bfdbfe';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  // 混入 75% 白色
  const lr = Math.round(r + (255 - r) * 0.72);
  const lg = Math.round(g + (255 - g) * 0.72);
  const lb = Math.round(b + (255 - b) * 0.72);
  return `rgb(${lr},${lg},${lb})`;
};

export default function GanttChart() {
  const queryClient = useQueryClient();
  const CELL_WIDTH = 40; // Fixed cell width for month view
  const ROW_HEIGHT = 40;
  const MONTH_HEADER_HEIGHT = 26;
  const DATE_HEADER_HEIGHT = ROW_HEIGHT + 20;
  const LEAVE_HEADER_HEIGHT = 32;

  // 無限捲動：真正的 window 模型（只延伸邊界，不重建整條 timeline）
  const [startDate, setStartDate] = useState(() => subDays(new Date(), 180));
  const [endDate, setEndDate] = useState(() => addDays(new Date(), 180));
  const rightPanelContainerRef = useRef(null);
  
  // 使用 custom hooks
  const { clearSelection } = useSelectionState();
  const { isDragging, setIsDragging, dragTaskId, setDragTaskId, dragStart, setDragStart, dragEnd, setDragEnd } = useDragState();
  const { showAddProjectDialog, setShowAddProjectDialog, showEditProjectDialog, setShowEditProjectDialog, editingProject, setEditingProject, showAddTaskDialog, setShowAddTaskDialog, showMilestoneDialog, setShowMilestoneDialog, showDurationDialog, setShowDurationDialog, showRollingDialog, setShowRollingDialog, showImportScheduleDialog, setShowImportScheduleDialog, showEditTaskDialog, setShowEditTaskDialog, editingTask, setEditingTask, editingProjectTasks, setEditingProjectTasks, deleteConfirm, setDeleteConfirm } = useDialogState();
  const { projectFormData, setProjectFormData, taskFormData, setTaskFormData, selectedSamples, setSelectedSamples } = useFormData();
  const { selectedDeptId, setSelectedDeptId, selectedGroupSlug, setSelectedGroupSlug, selectedBrandIds, setSelectedBrandIds, hideHolidays, setHideHolidays } = useFilterState();
  const { creatingProjectId, setCreatingProjectId, scheduleFile, setScheduleFile, isAnalyzingSchedule, setIsAnalyzingSchedule } = useProjectCreation();

  // Scroll refs
  const leftPanelRef = React.useRef(null);
  const rightPanelRef = React.useRef(null); // outer overflow-x-auto


  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [firstDate, setFirstDate] = useState(null);
  const [secondDate, setSecondDate] = useState(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(256); // w-64 = 256px
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const creatingProjectIdRef = useRef(null);
  const draggedProjectIdRef = useRef(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  // Fetch data
  const { data: ganttProjects = [] } = useQuery({
    queryKey: ['ganttProjects'],
    queryFn: () => base44.entities.GanttProject.list('sort_order'),
  });

  const { data: ganttTasks = [] } = useQuery({
    queryKey: ['ganttTasks'],
    queryFn: () => base44.entities.GanttTask.list('sort_order'),
  });

  const leaveQueryStart = format(startDate, 'yyyy-MM-dd');
  const leaveQueryEnd = format(endDate, 'yyyy-MM-dd');

  const { data: leaveRecords = [] } = useQuery({
    queryKey: ['leaveRecords', leaveQueryStart, leaveQueryEnd],
    queryFn: async () => {
      return base44.entities.LeaveRecord.filter({
        date: { $gte: leaveQueryStart, $lte: leaveQueryEnd }
      });
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('sort_order'),
  });

  const { data: samples = [] } = useQuery({
    queryKey: ['samples'],
    queryFn: () => base44.entities.Sample.list('sort_order'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('name'),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list('sort_order'),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list(),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });



  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Mutations
  const createGanttProject = useMutation({
    mutationFn: (data) => base44.entities.GanttProject.create(data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries(['ganttProjects']);
      setCreatingProjectIdSync(newProject.id);
      return newProject;
    },
  });

  const updateGanttProject = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GanttProject.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['ganttProjects']),
  });

  const deleteGanttProject = useMutation({
    mutationFn: (id) => base44.entities.GanttProject.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['ganttProjects']),
  });



  const uploadScheduleFile = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    },
  });

  const analyzeSchedule = useMutation({
    mutationFn: async (file_url) => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `分析這張時程表圖片或PDF，提取所有的任務名稱。請返回一個包含任務列表的JSON，格式如下：
{
  "tasks": [
    {"name": "任務名稱1"},
    {"name": "任務名稱2"}
  ]
}
只返回JSON，不要有其他文字。`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
      });
      return response;
    },
  });

  const createGanttTask = useMutation({
    mutationFn: (data) => base44.entities.GanttTask.create(data),
    onMutate: async (newTaskData) => {
      await queryClient.cancelQueries(['ganttTasks']);
      const previous = queryClient.getQueryData(['ganttTasks']);
      queryClient.setQueryData(['ganttTasks'], old => [
        ...(old || []),
        { ...newTaskData, id: `temp-${Date.now()}` }
      ]);
      return { previous };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['ganttTasks'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttTasks']);
      setShowAddTaskDialog(false);
      setTaskFormData({ name: '', is_important: false, note: '', time_type: '', start_date: '', end_date: '' });
      setCreatingProjectIdSync(null);
    },
  });

  // Update task (with optimistic update for time changes + undo support)
  const updateTaskWithOptimistic = (id, data) => {
    const previousTasks = queryClient.getQueryData(['ganttTasks']);
    const oldTask = previousTasks?.find(t => t.id === id);
    
    // 記錄撤銷堆疊（只記錄時間相關的變更，且不是 undo 操作本身）
    if (!isUndoingRef.current && (data.time_type !== undefined || data.start_date !== undefined || data.end_date !== undefined)) {
      undoStackRef.current.push({
        type: 'task_update',
        taskId: id,
        previousData: {
          time_type: oldTask?.time_type,
          start_date: oldTask?.start_date,
          end_date: oldTask?.end_date,
        }
      });
    }
    
    const newTasks = previousTasks?.map(task => 
      task.id === id ? { ...task, ...data } : task
    );
    queryClient.setQueryData(['ganttTasks'], newTasks);
    
    updateGanttTask.mutate({ id, data }, {
      onError: () => {
        queryClient.setQueryData(['ganttTasks'], previousTasks);
        undoStackRef.current.pop(); // 失敗時移除
      }
    });
  };

  const updateGanttTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GanttTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttTasks']);
      clearSelection();
    },
  });

  const deleteGanttTask = useMutation({
    mutationFn: (id) => base44.entities.GanttTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttTasks']);
    },
  });





  // ── Lookup Maps（需要先定義以供 days useMemo 使用）
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  // Get days：真正的 window 模型，只在邊界延伸時重算差異
  const days = useMemo(() => {
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    if (hideHolidays) {
      return allDays.filter(d => {
        const dow = getDay(d);
        return dow !== 0 && dow !== 6 && !holidaySet.has(format(d, 'yyyy-MM-dd'));
      });
    }
    return allDays;
  }, [startDate, endDate, hideHolidays, holidaySet]);

  // 建立統一的 rows 陣列（兩層：project + phase，任務直接畫在 phase 列上）
  const rows = useMemo(() => {
    return ganttProjects.map(project => ({
      type: 'project', data: project, id: `project-${project.id}`
    }));
  }, [ganttProjects]);

  // 計算 makalotGroup
  const makalotGroup = useMemo(() => {
    return groups.find(g => g.name.toLowerCase() === 'makalot');
  }, [groups]);

  // ── More Lookup Maps（定義早：employeeMap 需要在 filteredLeaveRecords 前面）
  const employeeMap = useMemo(() =>
    Object.fromEntries(employees.map(e => [e.id, e])), [employees]);

  const { filteredLeaveRecords, leaveCountByDate, leaveNamesByDate } = useMemo(() => {
    // 第一步：篩選請假記錄
    let filtered = leaveRecords;
    if (selectedDeptId) {
      const deptEmployeeIds = new Set(
        employees
          .filter(emp => (emp.department_ids || []).includes(selectedDeptId))
          .map(emp => emp.id)
      );
      filtered = leaveRecords.filter(r => deptEmployeeIds.has(r.employee_id));
    }

    // 判斷兩個日期是否為「工作日連續」（跳過週末和假日）
    const isConsecutiveWorkDays = (a, b) => {
      let cur = new Date(a);
      cur.setDate(cur.getDate() + 1);
      const end = new Date(b);
      while (cur < end) {
        const dow = cur.getDay();
        const dateStr = format(cur, 'yyyy-MM-dd');
        if (dow !== 0 && dow !== 6 && !holidaySet.has(dateStr)) {
          return false; // 中間有工作日 → 不連續
        }
        cur.setDate(cur.getDate() + 1);
      }
      return format(cur, 'yyyy-MM-dd') === b;
    };

    const formatShort = (dateStr) => {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    // 建立每位員工的所有請假日期（排序）
    const empDatesMap = {};
    filtered.forEach(r => {
      (empDatesMap[r.employee_id] ??= []).push(r.date);
    });
    Object.values(empDatesMap).forEach(dates => dates.sort());

    // 找連續區間
    const getRange = (empId, date) => {
      const dates = empDatesMap[empId] || [];
      const idx = dates.indexOf(date);
      if (idx < 0) return null;
      let start = idx, end = idx;
      while (start > 0 && isConsecutiveWorkDays(dates[start - 1], dates[start])) start--;
      while (end < dates.length - 1 && isConsecutiveWorkDays(dates[end], dates[end + 1])) end++;
      if (start === end) return null; // 單天，不顯示範圍
      return `${formatShort(dates[start])}–${formatShort(dates[end])}`;
    };

    // 第二步：統計每天請假人數和人員名單
    const countMap = {};
    const namesMap = {};
    filtered.forEach(r => {
      if (!countMap[r.date]) {
        countMap[r.date] = new Set();
        namesMap[r.date] = [];
      }
      countMap[r.date].add(r.employee_id);
      const name = employeeMap[r.employee_id]?.name || `未知員工(${r.employee_id.slice(0, 6)})`;
      if (!namesMap[r.date].find(item => item.employeeId === r.employee_id)) {
        const range = getRange(r.employee_id, r.date);
        namesMap[r.date].push({ name, range, employeeId: r.employee_id });
      }
    });

    // 轉換 countMap 中的 Set 為數字
    const countResult = {};
    Object.entries(countMap).forEach(([date, set]) => {
      countResult[date] = set.size;
    });

    return {
      filteredLeaveRecords: filtered,
      leaveCountByDate: countResult,
      leaveNamesByDate: namesMap,
    };
  }, [leaveRecords, selectedDeptId, employees, employeeMap, holidaySet]);

  const filteredBrands = useMemo(() => {
    if (!selectedGroupSlug) return projects;
    return projects.filter(p => p.group_id === selectedGroupSlug);
  }, [projects, selectedGroupSlug]);

  const visibleRows = useMemo(() => {
    return rows.filter(row => {
      // 集團篩選：直接用 brand 的 group_id 比對
      if (selectedGroupSlug) {
        const brand = projects.find(p => p.id === row.data.brand_id);
        if (brand?.group_id !== selectedGroupSlug) return false;
      }
      // 品牌篩選
      if (selectedBrandIds.length > 0 && !selectedBrandIds.includes(row.data.brand_id)) return false;
      return true;
    });
  }, [rows, selectedGroupSlug, selectedBrandIds, projects]);

  const getLeaveCountStyle = (count) => {
    if (!count) return null;
    if (count <= 2) return { bg: '#fef9c3', text: '#854d0e', label: `${count}人` };
    if (count <= 4) return { bg: '#ffedd5', text: '#9a3412', label: `${count}人` };
    return { bg: '#fee2e2', text: '#991b1b', label: `${count}人`, bold: true };
  };

  // 工作天數預先計算（移出 render，避免每次重新 loop）
  const workingDaysMap = useMemo(() => {
    const map = {};
    ganttTasks.forEach(task => {
      if (task.time_type !== 'duration' || !task.start_date || !task.end_date) return;
      const start = task.start_date.split('T')[0];
      const end = task.end_date.split('T')[0];
      let count = 0;
      const current = new Date(start);
      const endDate = new Date(end);
      while (current <= endDate) {
        const dow = getDay(current);
        if (dow !== 0 && dow !== 6 && !holidaySet.has(format(current, 'yyyy-MM-dd'))) count++;
        current.setDate(current.getDate() + 1);
      }
      map[task.id] = count;
    });
    return map;
  }, [ganttTasks, holidaySet]);

  // ── More Lookup Maps（employeeMap、tasksByProjectId 等）────────
  const tasksByProjectId = useMemo(() => {
    return ganttTasks.reduce((acc, task) => {
      (acc[task.gantt_project_id] ??= []).push(task);
      return acc;
    }, {});
  }, [ganttTasks]);

  const dayIndexMap = useMemo(() =>
    Object.fromEntries(days.map((d, i) => [format(d, 'yyyy-MM-dd'), i])),
    [days]);

  // 建立日期單元格屬性快取（避免每次 render 重複計算）
  const dayCellPropsMap = useMemo(() => {
    const map = {};
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dow = getDay(day);
      const isWeekend = dow === 0 || dow === 6;
      const isHoliday = !hideHolidays && holidaySet.has(dateStr);
      const isFirstOfMonth = format(day, 'd') === '1';
      map[dateStr] = {
        isWeekend,
        isHoliday,
        isFirstOfMonth,
        isToday: isToday(day),
        bgColor: (isWeekend || isHoliday) ? '#f3f4f6' : '#f9fafb',
      };
    });
    return map;
  }, [days, hideHolidays, holidaySet]);
  // ─────────────────────────────────────────────────────────────

  // 同步更新 creatingProjectId state 和 ref（避免 closure stale）
  const setCreatingProjectIdSync = (id) => {
    creatingProjectIdRef.current = id;
    setCreatingProjectId(id);
  };

  // Helper functions
  const getProjectColor = (ganttProject) => {
    const brand = projects.find(p => p.id === ganttProject.brand_id);
    return brand?.default_color || ganttProject.color || '#3b82f6';
  };

  const getSamplesByBrand = (brandId) => {
    return samples.filter((s) => s.project_id === brandId);
  };

  const getSelectedTaskName = () => {
    const task = ganttTasks.find(t => t.id === selectedTaskId);
    return task ? task.name : '';
  };

  const handleDeptChange = (deptId) => {
    setSelectedDeptId(deptId);
    
    if (!deptId) {
      setSelectedGroupSlug(null);
      setSelectedBrandIds([]);
      return;
    }
    
    const dept = departments.find(d => d.id === deptId);
    const groupId = dept?.group_id || null;
    setSelectedGroupSlug(groupId);
    
    // 清除不屬於新集團的已選品牌
    const validBrandIds = new Set(
      projects.filter(p => p.group_id === groupId).map(p => p.id)
    );
    setSelectedBrandIds(prev => prev.filter(id => validBrandIds.has(id)));
  };

  // Handlers
  const handleAddProject = async () => {
    const brand = projects.find(p => p.id === projectFormData.brand_id);
    const brandGroup = groups.find(g => g.id === brand?.group_id);
    const isMakalot = brandGroup?.name.toLowerCase() === 'makalot';
    const isTGT = brand?.short_name === 'TGT' || brand?.name === 'TGT';

    let name;
    if (isMakalot) {
      name = `${brand.short_name || brand.name}_${projectFormData.customName}`;
    } else {
      const yy = String(projectFormData.year).slice(-2);
      name = `${brand.short_name || brand.name} ${projectFormData.season}${yy}`;
    }

    await createGanttProject.mutateAsync({ ...projectFormData, name, created_by: currentUser?.id });
    setShowAddProjectDialog(false);
    setProjectFormData({ brand_id: '', season: '', year: new Date().getFullYear(), color: '#3b82f6' });
  };



  const handleAddTask = () => {
    const projectId = creatingProjectIdRef.current;
    if (!taskFormData.sample_id || !projectId) return;

    const sample = samples.find(s => s.id === taskFormData.sample_id);
    const tasksInProject = ganttTasks.filter((t) => t.gantt_project_id === projectId);
    const taskData = {
      name: sample.short_name || sample.name,
      gantt_project_id: projectId,
      sample_id: taskFormData.sample_id,
      sort_order: tasksInProject.length + 1,
    };

    if (taskFormData.time_type) {
      taskData.time_type = taskFormData.time_type;
      taskData.start_date = taskFormData.start_date || null;
      taskData.end_date = taskFormData.time_type === 'duration' ? (taskFormData.end_date || null) : null;
    }

    createGanttTask.mutate(taskData);
  };



  // 撤銷堆疊（用於 Ctrl+Z）
  const undoStackRef = useRef([]);
  const isUndoingRef = useRef(false);
  
  // 鍵盤快捷鍵：Ctrl+Z 撤銷
  React.useEffect(() => {
   const handleKeyDown = (e) => {
     if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
       e.preventDefault();
       if (undoStackRef.current.length > 0) {
         const lastAction = undoStackRef.current.pop();
         if (lastAction.type === 'task_update') {
           isUndoingRef.current = true;
           updateTaskWithOptimistic(lastAction.taskId, lastAction.previousData);
           isUndoingRef.current = false;
         }
       }
     }
   };
   window.addEventListener('keydown', handleKeyDown);
   return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 邊緣自動捲動 RAF ref
  const edgeScrollRafRef = useRef(null);

  // 全域 mouseup：防止拖曳後在格子外放開滑鼠造成狀態卡住
  React.useEffect(() => {
    if (!isDragging) return;
    const handleMouseUp = () => {
      if (dragStart && dragEnd && dragTaskId) {
        let start = dragStart < dragEnd ? dragStart : dragEnd;
        let end = dragStart < dragEnd ? dragEnd : dragStart;
        if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
          updateTaskWithOptimistic(dragTaskId, { time_type: 'milestone', start_date: format(start, 'yyyy-MM-dd'), end_date: null });
        } else {
          updateTaskWithOptimistic(dragTaskId, { time_type: 'duration', start_date: format(start, 'yyyy-MM-dd'), end_date: format(end, 'yyyy-MM-dd') });
        }
      }
      setIsDragging(false);
      setDragTaskId(null);
      // 停止邊緣捲動
      if (edgeScrollRafRef.current) {
        cancelAnimationFrame(edgeScrollRafRef.current);
        edgeScrollRafRef.current = null;
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging, dragStart, dragEnd, dragTaskId]);

  // 拖曳時，靠近邊緣自動捲動
  React.useEffect(() => {
    if (!isDragging) {
      if (edgeScrollRafRef.current) {
        cancelAnimationFrame(edgeScrollRafRef.current);
        edgeScrollRafRef.current = null;
      }
      return;
    }

    const EDGE_ZONE = 0;
    const SCROLL_SPEED = 10;

    const handleMouseMove = (e) => {
      const el = rightPanelRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX;

      // 停止舊的 edge-scroll
      if (edgeScrollRafRef.current) {
        cancelAnimationFrame(edgeScrollRafRef.current);
        edgeScrollRafRef.current = null;
      }

      // 右邊緣：貼到才觸發，固定速度
      if (mouseX > rect.right - EDGE_ZONE) {
        if (!edgeScrollRafRef.current) {
          const scroll = () => {
            if (!rightPanelRef.current || !isDragging) return;
            rightPanelRef.current.scrollLeft += SCROLL_SPEED;
            edgeScrollRafRef.current = requestAnimationFrame(scroll);
          };
          edgeScrollRafRef.current = requestAnimationFrame(scroll);
        }
      }
      // 左邊緣：貼到才觸發，固定速度
      else if (mouseX < rect.left + EDGE_ZONE) {
        if (!edgeScrollRafRef.current) {
          const scroll = () => {
            if (!rightPanelRef.current || !isDragging) return;
            rightPanelRef.current.scrollLeft -= SCROLL_SPEED;
            edgeScrollRafRef.current = requestAnimationFrame(scroll);
          };
          edgeScrollRafRef.current = requestAnimationFrame(scroll);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (edgeScrollRafRef.current) {
        cancelAnimationFrame(edgeScrollRafRef.current);
        edgeScrollRafRef.current = null;
      }
    };
  }, [isDragging]);

  const rightBodyRef = useRef(null);
  const prevDaysLengthRef = useRef(0);
  const prevStartDateRef = useRef(startDate);
  const pendingScrollCompensation = useRef(0);

  // useLayoutEffect：在瀏覽器 paint 前修正滾動位置（防止跳躍）
  React.useLayoutEffect(() => {
    if (pendingScrollCompensation.current !== 0 && rightPanelRef.current) {
      rightPanelRef.current.scrollLeft += pendingScrollCompensation.current;
      pendingScrollCompensation.current = 0;
    }
  });

  // 向左延伸時補償 scrollLeft（防止畫面跳躍）
  React.useLayoutEffect(() => {
    const el = rightPanelRef.current;
    if (!el || days.length === 0) return;

    const prevDaysLength = prevDaysLengthRef.current;
    const prevStart = prevStartDateRef.current;

    // 只有左邊新增日期時才需要補償（startDate 往前移）
    if (prevDaysLength > 0 && startDate < prevStart) {
      const addedDays = days.length - prevDaysLength;
      pendingScrollCompensation.current = addedDays * CELL_WIDTH;
    }

    prevDaysLengthRef.current = days.length;
    prevStartDateRef.current = startDate;
  }, [days.length, CELL_WIDTH, startDate]);

  // 同步垂直滾動：左側 panel ↔ 右側 body
  React.useEffect(() => {
    const left = leftPanelRef.current;
    const right = rightBodyRef.current;
    if (!left || !right) return;

    let isSyncing = false;

    const onLeft = () => {
      if (isSyncing) return;
      isSyncing = true;
      right.scrollTop = left.scrollTop;
      isSyncing = false;
    };
    const onRight = () => {
      if (isSyncing) return;
      isSyncing = true;
      left.scrollTop = right.scrollTop;
      isSyncing = false;
    };

    left.addEventListener('scroll', onLeft);
    right.addEventListener('scroll', onRight);

    return () => {
      left.removeEventListener('scroll', onLeft);
      right.removeEventListener('scroll', onRight);
    };
  }, []);

  // 初始化時捲到今天
  const initialScrollDone = useRef(false);
  React.useEffect(() => {
    if (initialScrollDone.current) return;
    const el = rightPanelRef.current;
    if (!el || days.length === 0) return;
    const todayIndex = days.findIndex(d => isToday(d));
    if (todayIndex >= 0) {
      el.scrollLeft = todayIndex * CELL_WIDTH - el.clientWidth / 2;
      initialScrollDone.current = true;
    }
  }, [days, CELL_WIDTH]);

  // 節流 ref
  const scrollExtendThrottleRef = useRef(0);

  // 捲動時延伸 buffer + 更新 visibleMonth
  const handleRightScroll = React.useCallback((e) => {
    const el = e.currentTarget;
    // 更新可見月份
    const scrolledDays = Math.floor(el.scrollLeft / CELL_WIDTH);
    
    // 拖曳 bar 時不觸發無限滾動延伸，避免與 edge-scroll 互相干擾
    if (isDragging || edgeScrollRafRef.current) return;

    // 節流：每 300ms 才能延伸一次，避免滾動條拖動觸發連鎖跳躍
    const now = Date.now();
    if (now - scrollExtendThrottleRef.current < 300) return;

    // 靠近右端：往右延伸
    if (el.scrollWidth - el.scrollLeft - el.clientWidth < CELL_WIDTH * 60) {
      scrollExtendThrottleRef.current = now;
      setCenterDate(d => addDays(d, 60));
    }
    // 靠近左端：往左延伸
    if (el.scrollLeft < CELL_WIDTH * 60) {
      scrollExtendThrottleRef.current = now;
      pendingScrollCompensation.current = CELL_WIDTH * 60;
      setCenterDate(d => subDays(d, 60));
    }
  }, [CELL_WIDTH, isDragging]);

  // 跳轉到今天
  const scrollToToday = () => {
    setCenterDate(new Date());
    initialScrollDone.current = false;
  };

  // 跳轉到任務最早日期
  const handleJumpToTasks = (projectId) => {
    const projectTasks = ganttTasks.filter(t => t.gantt_project_id === projectId && t.start_date);
    if (projectTasks.length === 0) return;
    const earliest = projectTasks.reduce((min, t) => {
      return t.start_date < min ? t.start_date : min;
    }, projectTasks[0].start_date);
    const targetDate = new Date(earliest);
    setCenterDate(targetDate);
    setTimeout(() => {
      const el = rightPanelRef.current;
      if (!el) return;
      const idx = days.findIndex(d => format(d, 'yyyy-MM-dd') >= earliest);
      if (idx >= 0) el.scrollLeft = idx * CELL_WIDTH - el.clientWidth / 3;
    }, 100);
  };

  // 確認設定里程碑
  const handleConfirmMilestone = () => {
    if (!firstDate || !selectedTaskId) return;
    updateTaskWithOptimistic(selectedTaskId, {
      time_type: 'milestone',
      start_date: format(firstDate, 'yyyy-MM-dd'),
      end_date: null,
    });
    setShowMilestoneDialog(false);
  };

  // 確認設定區間
  const handleConfirmDuration = () => {
    if (!firstDate || !selectedTaskId) return;
    
    let startDate = firstDate;
    let endDate = secondDate || firstDate;
    
    if (endDate < startDate) {
      [startDate, endDate] = [endDate, startDate];
    }
    
    updateTaskWithOptimistic(selectedTaskId, {
      time_type: 'duration',
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
    });
    setShowDurationDialog(false);
  };

  // 確認設定 Rolling
  const handleConfirmRolling = () => {
    if (!firstDate || !selectedTaskId) return;
    updateTaskWithOptimistic(selectedTaskId, {
      time_type: 'rolling',
      start_date: format(firstDate, 'yyyy-MM-dd'),
      end_date: null,
    });
    setShowRollingDialog(false);
  };



  const handleEditTask = () => {
    if (!editingTask) return;
    updateTaskWithOptimistic(editingTask.id, {
      name: editingTask.name,
      sample_id: editingTask.sample_id || null,
      time_type: editingTask.time_type || null,
      start_date: editingTask.start_date || null,
      end_date: editingTask.time_type === 'duration' ? (editingTask.end_date || null) : null,
    });
    setShowEditTaskDialog(false);
    setEditingTask(null);
  };



  // 拖曳排序 (with optimistic update)
  const updateSortOrder = useMutation({
    mutationFn: ({ id, entityType, sortOrder }) => {
      if (entityType === 'project') {
        return base44.entities.GanttProject.update(id, { sort_order: sortOrder });
      } else {
        return base44.entities.GanttTask.update(id, { sort_order: sortOrder });
      }
    },
    onMutate: ({ id, entityType, sortOrder }) => {
      if (entityType === 'project') {
        const previousData = queryClient.getQueryData(['ganttProjects']);
        queryClient.setQueryData(['ganttProjects'], previousData?.map(item =>
          item.id === id ? { ...item, sort_order: sortOrder } : item
        ));
        return { previousData, entityType };
      } else {
        const previousData = queryClient.getQueryData(['ganttTasks']);
        queryClient.setQueryData(['ganttTasks'], previousData?.map(item =>
          item.id === id ? { ...item, sort_order: sortOrder } : item
        ));
        return { previousData, entityType };
      }
    },
    onError: (error, variables, context) => {
      if (context?.entityType === 'project') {
        queryClient.setQueryData(['ganttProjects'], context.previousData);
      } else {
        queryClient.setQueryData(['ganttTasks'], context.previousData);
      }
    },
  });

  // 原生 HTML5 拖曳處理
  const handleProjectDragStart = (e, projectId) => {
    draggedProjectIdRef.current = projectId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', projectId);
    }
  };

  const handleProjectDragOver = (e, projectId) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    setDropTargetId(projectId);
  };

  const handleProjectDrop = (e, targetProjectId) => {
    e.preventDefault();
    setDropTargetId(null);
    const draggedId = draggedProjectIdRef.current;
    if (!draggedId || draggedId === targetProjectId) return;

    const allProjects = ganttProjects;
    const draggedIndex = allProjects.findIndex(i => i.id === draggedId);
    const targetIndex = allProjects.findIndex(i => i.id === targetProjectId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    // 立即更新 UI
    const reorderedItems = Array.from(allProjects);
    const [movedItem] = reorderedItems.splice(draggedIndex, 1);
    reorderedItems.splice(targetIndex, 0, movedItem);

    // 更新所有受影響項目的 sort_order
    const updatedItems = reorderedItems.map((item, idx) => ({ ...item, sort_order: idx }));
    queryClient.setQueryData(['ganttProjects'], updatedItems);

    // 背景同步 DB（只更新被拖曳的項目）
    updateSortOrder.mutate({ 
      id: draggedId, 
      entityType: 'project', 
      sortOrder: targetIndex 
    });
  };

  const handleProjectDragEnd = () => {
    draggedProjectIdRef.current = null;
  };

  // 渲染左側單元格（memoized）
  const renderLeftCell = useCallback((row) => {
    if (row.type === 'project') {
      const projectTasks = tasksByProjectId[row.data.id] ?? [];
      return (
        <div
          className="flex items-center gap-2 px-3"
          style={{
            height: ROW_HEIGHT,
            backgroundColor: getProjectColor(row.data),
            color: getContrastColor(getProjectColor(row.data)),
          }}
        >
          <GripVertical className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
          <span className="truncate flex-1 font-semibold text-[14px]">{row.data.name}</span>
          <div className="flex gap-1 flex-shrink-0 opacity-70">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCreatingProjectIdSync(row.data.id);
                setTaskFormData({ name: '', sample_id: '', is_important: false, note: '', time_type: '', start_date: '', end_date: '' });
                setShowAddTaskDialog(true);
              }}
              className="p-1 hover:bg-black/20 rounded"
              title="新增任務"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setEditingProject(row.data); setEditingProjectTasks(ganttTasks.filter(t => t.gantt_project_id === row.data.id)); setShowEditProjectDialog(true); }}
              className="p-1 hover:bg-black/20 rounded"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'project', id: row.data.id, name: row.data.name }); }}
              className="p-1 hover:bg-red-700/40 rounded"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }
  });








        // 取得排序後的日期
  const getSortedDates = () => {
    if (!firstDate) return { start: null, end: null };
    if (!secondDate) return { start: firstDate, end: firstDate };
    
    if (secondDate < firstDate) {
      return { start: secondDate, end: firstDate };
    }
    return { start: firstDate, end: secondDate };
  };

  const samplesForProject = useMemo(() => {
    if (!creatingProjectId) return [];
    const project = ganttProjects.find(p => p.id === creatingProjectId);
    return project ? getSamplesByBrand(project.brand_id) : [];
  }, [creatingProjectId, ganttProjects, samples]);

  const samplesForEditTask = useMemo(() => {
    if (!editingTask) return [];
    const project = ganttProjects.find(p => p.id === editingTask.gantt_project_id);
    return project ? getSamplesByBrand(project.brand_id) : [];
  }, [editingTask, ganttProjects, samples]);



  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">專案甘特圖</h1>
      </div>

      {/* Time Navigation - Layer 1 */}
      <TimeNavigation
        centerDate={centerDate}
        onCenterDateChange={setCenterDate}
        onScrollToToday={scrollToToday}
      />

      {/* Filter Bar - Layer 2 */}
      <FilterBar
        departments={departments}
        groups={groups}
        projects={filteredBrands}
        selectedDeptId={selectedDeptId}
        onDeptChange={handleDeptChange}
        selectedGroupSlug={selectedGroupSlug}
        onGroupChange={(groupId) => {
          setSelectedGroupSlug(groupId);
          setSelectedDeptId(null);
          if (!groupId) {
            setSelectedBrandIds([]);
          } else {
            const validBrandIds = new Set(
              projects.filter(p => p.group_id === groupId).map(p => p.id)
            );
            setSelectedBrandIds(prev => prev.filter(id => validBrandIds.has(id)));
          }
        }}
        selectedBrandIds={selectedBrandIds}
        onBrandChange={setSelectedBrandIds}
        hideHolidays={hideHolidays}
        onHideHolidaysChange={setHideHolidays}
        visibleRowCount={visibleRows.length}
        totalRowCount={rows.length}
      />



      {/* Gantt Chart */}
      <Card className="overflow-hidden">
          <div className="flex">
            {/* Left Panel */}
            <div
              className="flex-shrink-0 border-r border-gray-300 relative"
              style={{ width: leftPanelWidth }}
            >
              <div
                className="bg-gray-100 border-b border-gray-200"
                style={{ height: MONTH_HEADER_HEIGHT }}
              />
              <div
                className="bg-gray-100 border-b border-gray-300 px-3 font-semibold text-xl flex items-center gap-2"
                style={{ height: DATE_HEADER_HEIGHT }}
              >
                開發季
                <button
                  onClick={() => setShowAddProjectDialog(true)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                >
                  <Plus className="w-3 h-3" />
                  新增
                </button>
              </div>
              <div
                className="bg-white border-b border-gray-300 px-3 text-xs text-gray-500 flex items-center font-medium"
                style={{ height: LEAVE_HEADER_HEIGHT }}
              >
                請假人數
              </div>
              <div
                className="overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 440px)' }}
                ref={(el) => {
                  leftPanelRef.current = el;
                }}
              >
                {visibleRows.map((row) => (
                  <div
                    key={row.id}
                    className="border-b border-gray-200 relative"
                    draggable={true}
                    onDragStart={(e) => handleProjectDragStart(e, row.data.id)}
                    onDragOver={(e) => handleProjectDragOver(e, row.data.id)}
                    onDrop={(e) => handleProjectDrop(e, row.data.id)}
                    onDragEnd={() => handleProjectDragEnd()}
                    onDragLeave={() => setDropTargetId(null)}
                    style={{ cursor: 'move', opacity: draggedProjectIdRef.current === row.data.id ? 0.5 : 1, userSelect: 'none' }}
                  >
                    {dropTargetId === row.data.id && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-50" />
                    )}
                    {renderLeftCell(row)}
                  </div>
                ))}
                {visibleRows.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    點擊「新增開發季」開始
                  </div>
                )}
              </div>

              {/* 拖曳 handle */}
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-20"
                style={{ touchAction: 'none' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  isResizingRef.current = true;
                  resizeStartXRef.current = e.clientX;
                  resizeStartWidthRef.current = leftPanelWidth;
                  document.body.style.userSelect = 'none';
                  document.body.style.cursor = 'col-resize';

                  const onMouseMove = (e) => {
                    if (!isResizingRef.current) return;
                    const delta = e.clientX - resizeStartXRef.current;
                    const newWidth = Math.max(160, Math.min(480, resizeStartWidthRef.current + delta));
                    setLeftPanelWidth(newWidth);
                  };

                  const onMouseUp = () => {
                    isResizingRef.current = false;
                    document.body.style.userSelect = '';
                    document.body.style.cursor = '';
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                  };

                  window.addEventListener('mousemove', onMouseMove);
                  window.addEventListener('mouseup', onMouseUp);
                }}
              />
            
            </div>

          {/* Right Panel */}
          <div className="flex-1 overflow-x-auto" data-gantt-scroll ref={(el) => { rightPanelRef.current = el; rightPanelContainerRef.current = el; }} onScroll={handleRightScroll}>
            {/* 所有列共用同一個 grid track，完全對齊 */}
            {(() => {
              const gridStyle = {
                display: 'grid',
                gridTemplateColumns: `repeat(${days.length}, ${CELL_WIDTH}px)`,
              };
              const totalWidth = days.length * CELL_WIDTH;
              return (
                <div style={{ width: totalWidth }}>
                  {/* 月份 header */}
                          {(() => {
                            const monthGroups = [];
                            let current = null;
                            days.forEach((day) => {
                              const monthKey = format(day, 'yyyy-MM');
                              if (current?.key !== monthKey) {
                                current = { key: monthKey, label: format(day, 'yyyy年M月'), count: 1 };
                                monthGroups.push(current);
                              } else {
                                current.count++;
                              }
                            });
                            return (
                              <div className="flex border-b border-gray-200" style={{ height: MONTH_HEADER_HEIGHT }}>
                                 {monthGroups.map(g => (
                                   <div
                                     key={g.key}
                                     className="border-r border-gray-300 text-sm font-bold text-gray-700 flex items-center justify-center bg-gray-100 flex-shrink-0"
                                     style={{ width: g.count * CELL_WIDTH, height: MONTH_HEADER_HEIGHT }}
                                  >
                            {g.label}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* 日期 header */}
                  <div style={{ ...gridStyle, height: DATE_HEADER_HEIGHT, borderBottom: '1px solid #d1d5db' }}>
                    {days.map((day) => {
                       const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                       const isHolidayHeader = !hideHolidays && holidaySet.has(format(day, 'yyyy-MM-dd'));
                       const isFirstDay = format(day, 'd') === '1';
                       return (
                        <div
                          key={day.toISOString()}
                          className={`border-r border-gray-200 flex flex-col items-center justify-center gap-0.5 ${
                            isToday(day) ? 'bg-red-100 text-red-700' :
                            (isWeekend || isHolidayHeader) ? 'bg-gray-200 text-gray-500' :
                            'bg-gray-100 text-gray-700'
                          }`}
                          style={{ borderLeft: isFirstDay ? '2px solid #6b7280' : undefined }}
                         >
                           <span className="text-sm font-bold leading-none">{format(day, 'd')}</span>
                           <span className={`text-[11px] leading-none ${isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
                             {format(day, 'EEE', { locale: zhTW })}
                           </span>
                         </div>
                       );
                     })}
                  </div>

                  {/* 請假人數列 */}
                  <div style={{ ...gridStyle, height: LEAVE_HEADER_HEIGHT, borderBottom: '1px solid #d1d5db', backgroundColor: 'white' }}>
                    {days.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const isWeekendLeave = getDay(day) === 0 || getDay(day) === 6;
                      const isHolidayLeave = holidays?.some(h => h.date === dateStr);
                      const isDimmedLeave = isWeekendLeave || isHolidayLeave;
                      const count = leaveCountByDate[dateStr] || 0;
                      const leaveStyle = getLeaveCountStyle(count);
                      const cellContent = (
                        <div
                          key={day.toISOString()}
                          className="border-r border-gray-200 flex items-center justify-center"
                          style={{
                            backgroundColor: leaveStyle?.bg || (isDimmedLeave ? '#d1d5db' : 'transparent'),
                            fontSize: 11,
                            fontWeight: leaveStyle?.bold ? 700 : 600,
                            color: leaveStyle?.text || '#d1d5db',
                            cursor: count ? 'pointer' : 'default',
                          }}
                        >
                          {leaveStyle?.label || ''}
                        </div>
                      );
                      if (!count) return cellContent;
                      const names = leaveNamesByDate[dateStr] || [];
                      return (
                        <Popover key={day.toISOString()}>
                          <PopoverTrigger asChild>{cellContent}</PopoverTrigger>
                          <PopoverContent className="w-max p-2 text-xs" side="bottom" align="center">
                            {names.map((item, idx) => (
                              <p key={idx} className="text-gray-800 py-0.5 whitespace-nowrap">
                                {item.name}
                                {item.range && <span className="text-gray-400 ml-1">({item.range})</span>}
                              </p>
                            ))}
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>

                  {/* rows */}
                  <div
                    className="overflow-y-auto"
                    ref={rightBodyRef}
                    style={{ maxHeight: 'calc(100vh - 440px)' }}
                  >
                    {visibleRows.map((row) => (
                      <GanttRow
                        key={row.id}
                        row={row}
                        days={days}
                        dayCellPropsMap={dayCellPropsMap}
                        dayIndexMap={dayIndexMap}
                        tasks={tasksByProjectId[row.data.id] ?? []}
                        projectColor={getProjectColor(row.data)}
                        workingDaysMap={workingDaysMap}
                        isDragging={isDragging}
                        dragTaskId={dragTaskId}
                        dragStart={dragStart}
                        dragEnd={dragEnd}
                        dropTargetId={dropTargetId === row.data.id}
                        gridStyle={gridStyle}
                        CELL_WIDTH={CELL_WIDTH}
                        ROW_HEIGHT={ROW_HEIGHT}
                        onEditTask={(task) => { setEditingTask({ ...task }); setShowEditTaskDialog(true); }}
                        onDragStart={(e) => handleProjectDragStart(e, row.data.id)}
                        onDragOver={(e) => handleProjectDragOver(e, row.data.id)}
                        onDrop={(e) => handleProjectDrop(e, row.data.id)}
                        onDragEnd={handleProjectDragEnd}
                        onDragLeave={() => setDropTargetId(null)}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
            </div>
            </div>
            </Card>

      {/* ===== Dialogs ===== */}

      <MilestoneDialog
        open={showMilestoneDialog}
        onOpenChange={setShowMilestoneDialog}
        taskName={getSelectedTaskName()}
        firstDate={firstDate}
        onClearTime={() => { updateTaskWithOptimistic(selectedTaskId, { time_type: null, start_date: null, end_date: null }); setShowMilestoneDialog(false); }}
        onConfirm={handleConfirmMilestone}
      />

      <DurationDialog
        open={showDurationDialog}
        onOpenChange={setShowDurationDialog}
        taskName={getSelectedTaskName()}
        firstDate={firstDate}
        secondDate={secondDate}
        getSortedDates={getSortedDates}
        onClearTime={() => { updateTaskWithOptimistic(selectedTaskId, { time_type: null, start_date: null, end_date: null }); setShowDurationDialog(false); }}
        onConfirm={handleConfirmDuration}
      />

      <RollingDialog
        open={showRollingDialog}
        onOpenChange={setShowRollingDialog}
        taskName={getSelectedTaskName()}
        firstDate={firstDate}
        onClearTime={() => { updateTaskWithOptimistic(selectedTaskId, { time_type: null, start_date: null, end_date: null }); setShowRollingDialog(false); }}
        onConfirm={handleConfirmRolling}
      />



      <AddProjectDialog
        open={showAddProjectDialog}
        onOpenChange={setShowAddProjectDialog}
        projectFormData={projectFormData}
        setProjectFormData={setProjectFormData}
        projects={projects}
        groups={groups}
        ganttProjects={ganttProjects}
        onConfirm={handleAddProject}
        isLoading={createGanttProject.isPending}
      />

      <ImportScheduleDialog
        open={showImportScheduleDialog}
        onOpenChange={setShowImportScheduleDialog}
        scheduleFile={scheduleFile}
        setScheduleFile={setScheduleFile}
        onConfirm={async () => {
          if (!scheduleFile || !creatingProjectId) return;
          setIsAnalyzingSchedule(true);
          try {
            const { file_url } = await uploadScheduleFile.mutateAsync(scheduleFile);
            const result = await analyzeSchedule.mutateAsync(file_url);
            if (result && result.tasks && result.tasks.length > 0) {
              for (const task of result.tasks) {
                if (task.name.trim()) {
                  // 嘗試找到對應的樣品
                  const sample = samples.find(s => 
                    (s.short_name || s.name).toLowerCase() === task.name.trim().toLowerCase()
                  );
                  if (sample) {
                     createGanttTask.mutate({
                       gantt_project_id: creatingProjectId,
                       name: sample.short_name || sample.name,
                       sample_id: sample.id,
                       sort_order: (ganttTasks.filter(t => t.gantt_project_id === creatingProjectId).length) + 1,
                       time_type: 'milestone',
                     });
                   }
                }
              }
              queryClient.invalidateQueries(['ganttTasks']);
              setShowImportScheduleDialog(false);
              setScheduleFile(null);
              setCreatingProjectId(null);
            }
          } finally {
            setIsAnalyzingSchedule(false);
          }
        }}
        isAnalyzing={isAnalyzingSchedule}
      />

      <EditProjectDialog
        open={showEditProjectDialog}
        onOpenChange={setShowEditProjectDialog}
        project={editingProject}
        setProject={setEditingProject}
        projectTasks={editingProjectTasks}
        onUpdateTask={(taskId, updatedTask) => {
          setEditingProjectTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        }}
        onDeleteTask={(taskId) => {
          deleteGanttTask.mutate(taskId, {
            onSuccess: () => setEditingProjectTasks(prev => prev.filter(t => t.id !== taskId))
          });
        }}
        onSave={() => {
          updateGanttProject.mutate({ id: editingProject.id, data: { name: editingProject.name } });
          editingProjectTasks.forEach(task => {
            const original = ganttTasks.find(t => t.id === task.id);
            if (!original) return;

            const timeChanged =
              original.time_type !== task.time_type ||
              original.start_date !== task.start_date ||
              original.end_date !== task.end_date;

            if (timeChanged) {
              updateGanttTask.mutate({
                id: task.id,
                data: {
                  time_type: task.time_type || null,
                  start_date: task.start_date || null,
                  end_date: task.time_type === 'duration' ? (task.end_date || null) : null,
                }
              });
            }
          });
          setShowEditProjectDialog(false);
        }}
      />



      <AddTaskDialog
        open={showAddTaskDialog}
        onOpenChange={(open) => {
          setShowAddTaskDialog(open);
          if (!open) setCreatingProjectIdSync(null);
        }}
        taskFormData={taskFormData}
        setTaskFormData={setTaskFormData}
        onConfirm={handleAddTask}
        samplesForProject={samplesForProject}
      />

      {/* Edit Task Dialog */}
      <Dialog open={showEditTaskDialog} onOpenChange={setShowEditTaskDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>編輯任務</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-2">
              <div>
                <Label>樣品</Label>
                <div className="mt-1 flex items-center h-10 px-3 border border-gray-300 rounded-md text-sm bg-gray-50">
                  {editingTask.name || '未設定'}
                </div>
              </div>
              <div className="border-t pt-4">
                <Label className="mb-2 block text-gray-600">時間類型</Label>
                <div className="flex gap-1.5">
                  {[
                    { value: 'milestone', label: '◆ 里程碑' },
                    { value: 'duration', label: '▬ 區間' },
                    { value: 'rolling', label: '▶ Rolling' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditingTask({ 
                        ...editingTask, 
                        time_type: editingTask.time_type === opt.value ? '' : opt.value,
                        start_date: '', 
                        end_date: '' 
                      })}
                      className={`flex-1 text-xs px-1.5 py-1.5 rounded border transition-colors ${
                        editingTask.time_type === opt.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {editingTask.time_type === 'milestone' && (
                  <div className="mt-3">
                    <Label className="text-xs">日期</Label>
                    <Input type="date" value={editingTask.start_date || ''} className="mt-1"
                      onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })} />
                  </div>
                )}
                {editingTask.time_type === 'duration' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">開始</Label>
                      <Input type="date" value={editingTask.start_date || ''} className="mt-1"
                        onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">結束</Label>
                      <Input type="date" value={editingTask.end_date || ''} className="mt-1"
                        min={editingTask.start_date}
                        onChange={(e) => setEditingTask({ ...editingTask, end_date: e.target.value })} />
                    </div>
                  </div>
                )}
                {editingTask.time_type === 'rolling' && (
                  <div className="mt-3">
                    <Label className="text-xs">開始日期</Label>
                    <Input type="date" value={editingTask.start_date || ''} className="mt-1"
                      onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })} />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteConfirm({ type: 'task', id: editingTask?.id, name: editingTask?.name });
              }}
            >
              刪除
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEditTaskDialog(false)}>取消</Button>
              <Button size="sm" onClick={handleEditTask} disabled={!editingTask?.name} className="bg-blue-600 hover:bg-blue-700">
                儲存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>確定要刪除？</AlertDialogTitle>
          <AlertDialogDescription>
            「{deleteConfirm?.name}」刪除後無法復原。
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteConfirm?.type === 'project') {
                  deleteGanttProject.mutate(deleteConfirm.id);
                } else if (deleteConfirm?.type === 'task') {
                  deleteGanttTask.mutate(deleteConfirm.id);
                  setShowEditTaskDialog(false);
                  setEditingTask(null);
                }
                setDeleteConfirm(null);
              }}
            >
              確定刪除
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* 操作說明 */}
      <details className="mt-4 text-sm text-gray-600">
        <summary className="cursor-pointer font-medium">📖 操作說明</summary>
        <ul className="mt-2 ml-4 space-y-1 list-disc">
          <li><strong>新增開發季</strong>：點擊「＋ 新增」，選品牌與季節建立</li>
          <li><strong>新增任務</strong>：點擊開發季列的 ＋，選樣品與時間類型</li>
          <li><strong>編輯／刪除任務</strong>：點擊 bar 開啟對話框操作</li>
          <li><strong>時間類型</strong>：◆ 里程碑（單日）、▬ 區間（起訖日）、▶ Rolling（持續延伸）</li>
          <li><strong>篩選</strong>：點擊集團／品牌／部門標籤過濾；「僅工作日」可隱藏週末假日</li>
          <li><strong>請假人數</strong>：點擊數字查看名單，連假顯示日期區間</li>
          <li><strong>撤銷</strong>：Ctrl+Z（Mac ⌘Z）撤銷上一次時間變更</li>
        </ul>
      </details>
      </div>
    </TooltipProvider>
      );
      }