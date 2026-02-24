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
import { Plus, Diamond, ArrowRight, Repeat, GripVertical, Upload, Edit2, Trash2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { addDays, addWeeks, subDays, format, eachDayOfInterval, isToday, startOfWeek, getDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AddProjectDialog from '@/components/gantt/AddProjectDialog';
import EditProjectDialog from '@/components/gantt/EditProjectDialog';
import AddPhaseDialog from '@/components/gantt/AddPhaseDialog';
import AddTaskDialog from '@/components/gantt/AddTaskDialog';
import EditPhaseDialog from '@/components/gantt/EditPhaseDialog';
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

const ROW_HEIGHT = 40;

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

  // 無限捲動：以 centerDate 為中心動態生成日期
  const [centerDate, setCenterDate] = useState(new Date());
  const rightPanelContainerRef = useRef(null);
  
  // 使用 custom hooks
  const { clearSelection } = useSelectionState();
  const { isDragging, setIsDragging, dragTaskId, setDragTaskId, dragStart, setDragStart, dragEnd, setDragEnd } = useDragState();
  const { showAddProjectDialog, setShowAddProjectDialog, showEditProjectDialog, setShowEditProjectDialog, editingProject, setEditingProject, showAddTaskDialog, setShowAddTaskDialog, showMilestoneDialog, setShowMilestoneDialog, showDurationDialog, setShowDurationDialog, showRollingDialog, setShowRollingDialog, showImportScheduleDialog, setShowImportScheduleDialog, showEditPhaseDialog, setShowEditPhaseDialog, showEditTaskDialog, setShowEditTaskDialog, editingTask, setEditingTask, editingProjectTasks, setEditingProjectTasks, editingPhase, setEditingPhase, editingPhaseName, setEditingPhaseName, editingPhaseTasks, setEditingPhaseTasks, newTaskName, setNewTaskName, deleteConfirm, setDeleteConfirm } = useDialogState();
  const { projectFormData, setProjectFormData, taskFormData, setTaskFormData, selectedSamples, setSelectedSamples } = useFormData();
  const { selectedDeptId, setSelectedDeptId, selectedGroupSlug, setSelectedGroupSlug, selectedBrandIds, setSelectedBrandIds, hideHolidays, setHideHolidays, clearFilters } = useFilterState();
  const { creatingProjectId, setCreatingProjectId, projectCreationMode, setProjectCreationMode, scheduleFile, setScheduleFile, isAnalyzingSchedule, setIsAnalyzingSchedule } = useProjectCreation();

  // Scroll refs
  const leftPanelRef = React.useRef(null);
  const rightPanelRef = React.useRef(null); // outer overflow-x-auto

  const [currentPhaseId, setCurrentPhaseId] = useState(null);
  const [showAddPhaseDialog, setShowAddPhaseDialog] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(256); // w-64 = 256px
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const creatingProjectIdRef = useRef(null);

  // Fetch data
  const { data: ganttProjects = [] } = useQuery({
    queryKey: ['ganttProjects'],
    queryFn: () => base44.entities.GanttProject.list('sort_order'),
  });

  const { data: ganttPhases = [] } = useQuery({
    queryKey: ['ganttPhases'],
    queryFn: () => base44.entities.GanttPhase.list('sort_order'),
  });

  const { data: ganttTasks = [] } = useQuery({
    queryKey: ['ganttTasks'],
    queryFn: () => base44.entities.GanttTask.list('sort_order'),
  });

  // days 需要先算出來給 leaveRecords 用，但 days 依賴 centerDate
  // 所以先計算 leaveRecords 的查詢範圍
  const leaveQueryStart = format(subDays(centerDate, 90), 'yyyy-MM-dd');
  const leaveQueryEnd = format(addDays(centerDate, 180), 'yyyy-MM-dd');

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

  const bulkCreatePhases = useMutation({
    mutationFn: async (phases) => {
      for (const phase of phases) {
        await base44.entities.GanttPhase.create(phase);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttPhases']);
      setSelectedSamples({});
      setProjectFormData({ brand_id: '', season: '' });
      setScheduleFile(null);
    },
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
    onSuccess: (newTask) => {
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

  const updateGanttPhase = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GanttPhase.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['ganttPhases']),
  });



  // ── Lookup Maps（需要先定義以供 days useMemo 使用）
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  // Get days for month view (infinite scroll: center ± buffer)
  const days = useMemo(() => {
    const start = subDays(centerDate, 60);
    const end = addDays(centerDate, 120);
    const allDays = eachDayOfInterval({ start, end });
    // 隱藏假日時過濾掉週末和假日
    if (hideHolidays) {
      return allDays.filter(d => {
        const dow = getDay(d);
        const isWeekend = dow === 0 || dow === 6;
        const isHoliday = holidaySet.has(format(d, 'yyyy-MM-dd'));
        return !isWeekend && !isHoliday;
      });
    }
    return allDays;
  }, [centerDate, hideHolidays, holidaySet]);

  // 建立統一的 rows 陣列（兩層：project + phase，任務直接畫在 phase 列上）
  const rows = useMemo(() => {
    return ganttProjects.map(project => ({
      type: 'project', data: project, id: `project-${project.id}`
    }));
  }, [ganttProjects]);

  // 先計算 makalotGroup
  const makalotGroup = useMemo(() => {
    const found = groups.find(g => g.name.toLowerCase() === 'makalot');
    console.log('groups:', groups, 'makalotGroup:', found);
    return found;
  }, [groups]);

  // 再計算 getDept（它依賴 makalotGroup，用 useCallback 避免重複定義）
  const getDept = useCallback((ganttProject) => {
    const brand = projects.find(p => p.id === ganttProject.brand_id);
    if (!brand) return 'dpc';  // 找不到品牌 → 視為 DPC
    return brand.group_id === makalotGroup?.id ? 'makalot' : 'dpc';
    // 沒有集團 (group_id 為 null) → group_id !== makalotGroup?.id → 歸入 DPC
  }, [projects, makalotGroup]);

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

    // 第二步：統計每天請假人數和人員名單
    const countMap = {};
    const namesMap = {};
    filtered.forEach(r => {
      if (!countMap[r.date]) {
        countMap[r.date] = new Set();
        namesMap[r.date] = [];
      }
      countMap[r.date].add(r.employee_id);
      // 直接存名字而不只是 ID
      const name = employeeMap[r.employee_id]?.name;
      if (name && !namesMap[r.date].includes(name)) {
        namesMap[r.date].push(name);
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
  }, [leaveRecords, selectedDeptId, employees, employeeMap]);

  const filteredBrands = useMemo(() => {
    if (!selectedGroupSlug) return projects;
    
    if (selectedGroupSlug === 'makalot') {
      // makalot：只留在 makalot 集團內的品牌
      return projects.filter(p => {
        const group = groups.find(g => g.id === p.group_id);
        return group?.name.toLowerCase() === 'makalot';
      });
    }
    
    // DPC：留下「無集團」或「非 makalot 集團」的所有品牌
    return projects.filter(p => {
      const group = groups.find(g => g.id === p.group_id);
      return !group || group.name.toLowerCase() !== 'makalot';
    });
  }, [projects, groups, selectedGroupSlug]);

  const visibleRows = useMemo(() => {
    return rows.filter(row => {
      // 集團篩選（用 slug）
      if (selectedGroupSlug && getDept(row.data) !== selectedGroupSlug) return false;
      // 品牌篩選
      if (selectedBrandIds.length > 0 && !selectedBrandIds.includes(row.data.brand_id)) return false;
      return true;
    });
  }, [rows, selectedGroupSlug, selectedBrandIds, getDept]);

  const getLeaveCountStyle = (count) => {
    if (!count) return null;
    if (count <= 2) return { bg: '#fef9c3', text: '#854d0e', label: `${count}人` };
    if (count <= 4) return { bg: '#ffedd5', text: '#9a3412', label: `${count}人` };
    return { bg: '#fee2e2', text: '#991b1b', label: `${count}人`, bold: true };
  };

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
  const getBrandName = (brandId) => {
    const project = projects.find((p) => p.id === brandId);
    return project ? (project.short_name || project.name) : '-';
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
    const group = groups.find(g => g.id === dept?.group_id);
    const slug = group?.name.toLowerCase() === 'makalot' ? 'makalot' : 'dpc';
    setSelectedGroupSlug(slug);
    
    // 清除不屬於新集團的已選品牌
    const validBrandIds = new Set(
      projects
        .filter(p => {
          const g = groups.find(g => g.id === p.group_id);
          return g?.name.toLowerCase() === slug;
        })
        .map(p => p.id)
    );
    setSelectedBrandIds(prev => prev.filter(id => validBrandIds.has(id)));
  };

  // Handlers
  const handleAddProject = async () => {
    if (!projectFormData.brand_id || !projectFormData.season || !projectFormData.year) return;
    const brand = projects.find(p => p.id === projectFormData.brand_id);
    const yy = String(projectFormData.year).slice(-2);
    const name = `${brand.short_name || brand.name} ${projectFormData.season}${yy}`;
    await createGanttProject.mutateAsync({ ...projectFormData, name, created_by: currentUser?.id });
    setShowAddProjectDialog(false);
    setProjectFormData({ brand_id: '', season: '', year: new Date().getFullYear(), color: '#3b82f6' });
  };

  const handleAddPhase = async () => {
    if (!creatingProjectId) return;

    const currentProjectPhases = ganttPhases.filter(p => p.gantt_project_id === creatingProjectId);
    const maxSortOrder = currentProjectPhases.reduce((max, p) => Math.max(max, p.sort_order || 0), 0);

    const selectedSampleIds = Object.keys(selectedSamples).filter((k) => selectedSamples[k]);
    if (selectedSampleIds.length === 0) return; 

    await bulkCreatePhases.mutateAsync(
        selectedSampleIds.map((sampleId, idx) => {
            const sample = samples.find((s) => s.id === sampleId);
            return {
                gantt_project_id: creatingProjectId,
                sample_id: sampleId,
                name: sample.short_name || sample.name,
                sort_order: maxSortOrder + idx + 1,
            };
        })
    );
    setShowAddPhaseDialog(false);
    setSelectedSamples({});
    setCreatingProjectId(null);
  };

  const handleAddTask = () => {
    const projectId = creatingProjectIdRef.current;
    if (!taskFormData.name || !projectId) return;

    const tasksInProject = ganttTasks.filter((t) => t.gantt_project_id === projectId);
    const taskData = {
      name: taskFormData.name,
      gantt_project_id: projectId,
      sample_id: taskFormData.sample_id || null,
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
  const prevCenterDateRef = useRef(centerDate);
  const pendingScrollCompensation = useRef(0);

  // useLayoutEffect：在瀏覽器 paint 前修正滾動位置（防止跳躍）
  React.useLayoutEffect(() => {
    if (pendingScrollCompensation.current !== 0 && rightPanelRef.current) {
      rightPanelRef.current.scrollLeft += pendingScrollCompensation.current;
      pendingScrollCompensation.current = 0;
    }
  });

  // 修復無限滾動滾動跳轉：當 centerDate 改變導致新日期加入時，補償滾動位置
  React.useLayoutEffect(() => {
    const el = rightPanelRef.current;
    if (!el || days.length === 0) return;

    const prevDaysLength = prevDaysLengthRef.current;
    
    // 如果向左擴展（新增了左邊的日期），需要補償 scrollLeft
    if (prevDaysLength > 0 && days.length > prevDaysLength) {
      const addedDays = days.length - prevDaysLength;
      pendingScrollCompensation.current = addedDays * CELL_WIDTH;
    }

    prevDaysLengthRef.current = days.length;
    prevCenterDateRef.current = centerDate;
  }, [days.length, CELL_WIDTH, centerDate]);

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

  // 顯示的月份（根據捲動位置計算）
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  // 節流 ref
  const wheelThrottleRef = useRef(0);

  // 精確橫向滾動：每個 tick 固定移動 1 格（無動量）
  const handleRightWheel = useCallback((e) => {
    const absDeltaX = Math.abs(e.deltaX);
    const absDeltaY = Math.abs(e.deltaY);
    
    // 純垂直滾動不攔截
    if (absDeltaY > absDeltaX * 2 && absDeltaX < 5) return;
    
    e.preventDefault();
    const el = rightPanelRef.current;
    if (!el) return;

    // 節流：每 120ms 最多處理一次
    const now = Date.now();
    if (now - wheelThrottleRef.current < 120) return;
    wheelThrottleRef.current = now;

    // 正規化 delta 值（處理不同 deltaMode）
    let rawDelta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    if (e.deltaMode === 1) rawDelta *= 16;   // line mode → pixel
    if (e.deltaMode === 2) rawDelta *= 100;  // page mode → pixel

    // 每次精確移動 1 格，完全沒有累積或動量
    const step = Math.sign(rawDelta) * CELL_WIDTH;
    el.scrollLeft += step;
  }, [CELL_WIDTH]);

  // 節流 ref
  const scrollExtendThrottleRef = useRef(0);

  // 捲動時延伸 buffer + 更新 visibleMonth
  const handleRightScroll = React.useCallback((e) => {
    const el = e.currentTarget;
    // 更新可見月份
    const scrolledDays = Math.floor(el.scrollLeft / CELL_WIDTH);
    if (days[scrolledDays]) setVisibleMonth(days[scrolledDays]);
    
    // 拖曳 bar 時不觸發無限滾動延伸，避免與 edge-scroll 互相干擾
    if (isDragging) return;

    // 節流：每 800ms 才能延伸一次，避免滾動條拖動觸發連鎖跳躍
    const now = Date.now();
    if (now - scrollExtendThrottleRef.current < 800) return;

    // 靠近右端：往右延伸
    if (el.scrollWidth - el.scrollLeft - el.clientWidth < CELL_WIDTH * 30) {
      scrollExtendThrottleRef.current = now;
      setCenterDate(d => addDays(d, 30));
    }
    // 靠近左端：往左延伸
    if (el.scrollLeft < CELL_WIDTH * 30) {
      scrollExtendThrottleRef.current = now;
      pendingScrollCompensation.current = CELL_WIDTH * 30;
      setCenterDate(d => subDays(d, 30));
    }
  }, [CELL_WIDTH, isDragging]);

  // 跳轉到今天
  const scrollToToday = () => {
    setCenterDate(new Date());
    initialScrollDone.current = false;
  };

  // 跳轉到任務最早日期
  const handleJumpToTasks = (phaseId) => {
    const phaseTasks = ganttTasks.filter(t => t.gantt_phase_id === phaseId && (t.start_date || t.date));
    if (phaseTasks.length === 0) return;
    const earliest = phaseTasks.reduce((min, t) => {
      const d = t.start_date || t.date;
      return d < min ? d : min;
    }, phaseTasks[0].start_date || phaseTasks[0].date);
    const targetDate = new Date(earliest);
    setCenterDate(targetDate);
    // scroll after re-render
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
      } else if (entityType === 'phase') {
        return base44.entities.GanttPhase.update(id, { sort_order: sortOrder });
      } else if (entityType === 'task') {
        return base44.entities.GanttTask.update(id, { sort_order: sortOrder });
      }
    },
    onMutate: ({ id, entityType, sortOrder }) => {
      // 保存原始数据用于回滚
      let previousData = {};
      
      if (entityType === 'project') {
        previousData = queryClient.getQueryData(['ganttProjects']);
        const newData = previousData?.map(item => 
          item.id === id ? { ...item, sort_order: sortOrder } : item
        );
        queryClient.setQueryData(['ganttProjects'], newData);
      } else if (entityType === 'phase') {
        previousData = queryClient.getQueryData(['ganttPhases']);
        const newData = previousData?.map(item => 
          item.id === id ? { ...item, sort_order: sortOrder } : item
        );
        queryClient.setQueryData(['ganttPhases'], newData);
      } else if (entityType === 'task') {
        previousData = queryClient.getQueryData(['ganttTasks']);
        const newData = previousData?.map(item => 
          item.id === id ? { ...item, sort_order: sortOrder } : item
        );
        queryClient.setQueryData(['ganttTasks'], newData);
      }
      
      return { previousData, entityType };
    },
    onError: (error, variables, context) => {
      // 恢复原始数据
      if (context?.entityType === 'project') {
        queryClient.setQueryData(['ganttProjects'], context.previousData);
      } else if (context?.entityType === 'phase') {
        queryClient.setQueryData(['ganttPhases'], context.previousData);
      } else if (context?.entityType === 'task') {
        queryClient.setQueryData(['ganttTasks'], context.previousData);
      }
    },
  });

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.index === destination.index && source.droppableId === destination.droppableId) return;

    // 解析 droppableId 格式: "droppable-{type}" 或 "droppable-{parentType}-{parentId}"
    const [,, destParentId] = destination.droppableId.split('-');

    // 需要同一層級拖曳
    if (source.droppableId !== destination.droppableId) return;

    const [, sourceType] = source.droppableId.split('-');

    // 取得該層的所有項目
    let items = [];
    if (sourceType === 'project') {
      items = visibleRows.map(r => r.data); // 用篩選後的順序，與 Draggable index 一致
    } else if (sourceType === 'phase') {
      items = ganttPhases.filter(p => p.gantt_project_id === destParentId);
    } else if (sourceType === 'task') {
      items = ganttTasks.filter(t => t.gantt_project_id === destParentId);
    }

    // 新排序
    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(source.index, 1);
    reorderedItems.splice(destination.index, 0, movedItem);

    // 批量更新所有项目的排序（并发执行）
    Promise.all(
      reorderedItems.map((item, idx) =>
        new Promise((resolve) => {
          updateSortOrder.mutate(
            {
              id: item.id,
              entityType: sourceType,
              sortOrder: idx,
            },
            {
              onSuccess: resolve,
              onError: resolve, // 无论成功或失败都继续
            }
          );
        })
      )
    );
  };

  // 渲染左側單元格（memoized）
  const renderLeftCell = useCallback((row) => {
    if (row.type === 'project') {
      const projectTasks = tasksByProjectId[row.data.id] ?? [];
      return (
        <div
          className="flex items-center gap-2 px-3 font-bold text-sm"
          style={{
            height: ROW_HEIGHT,
            backgroundColor: row.data.color || '#3b82f6',
            color: getContrastColor(row.data.color || '#3b82f6'),
          }}
        >
          <span className="truncate flex-1">{row.data.name}</span>
          <div className="flex gap-1 flex-shrink-0">
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

  // 正規化日期（移除時間戳記）
  const normalizeDate = (dateStr) => {
    if (!dateStr) return null;
    return dateStr.split('T')[0]; // "2026-02-27T00:00:00.000Z" → "2026-02-27"
  };

  // 計算工作天數
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

  // 渲染右側單元格背景（只處理視覺，不渲染 Bar）（memoized）
  const renderCellBackground = useCallback((row, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const props = dayCellPropsMap[dateStr];
    const projectTasks = tasksByProjectId[row.data.id] ?? [];
    const hasDragOnProject = isDragging && projectTasks.some(t => t.id === dragTaskId);
    const isInDragRange = hasDragOnProject && dragStart && dragEnd && (() => {
      const s = format(dragStart < dragEnd ? dragStart : dragEnd, 'yyyy-MM-dd');
      const e = format(dragStart < dragEnd ? dragEnd : dragStart, 'yyyy-MM-dd');
      return dateStr >= s && dateStr <= e;
    })();

    const bgColor = isInDragRange ? '#bfdbfe' : props.bgColor;

    return (
      <div
        key={dateStr}
        style={{
          height: ROW_HEIGHT,
          borderRight: '1px solid #d1d5db',
          borderLeft: props.isFirstOfMonth ? '2px solid #6b7280' : undefined,
          backgroundColor: bgColor,
          position: 'relative',
        }}
      >
        {props.isToday && <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />}
        {props.isToday && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500" />}
      </div>
    );
  }, [dayCellPropsMap, tasksByProjectId, isDragging, dragTaskId, dragStart, dragEnd]);

  // Memoize renderTaskBars to avoid unnecessary re-renders
  const renderTaskBars = useCallback((row) => {
   if (row.type !== 'project') return null;
     const projectTasks = tasksByProjectId[row.data.id] ?? [];
     const projectColor = row.data.color || '#3b82f6';
     const textColor = getContrastColor(projectColor);

     // 找最近的可見日期（隱藏假日時用）
     const findVisibleIdx = (dateStr, direction = 'forward') => {
       if (dayIndexMap[dateStr] !== undefined) return dayIndexMap[dateStr];
       // 假日被隱藏時，往前/後找最近的可見日
       const date = new Date(dateStr);
       for (let i = 1; i <= 7; i++) {
         const tryStr = format(
           direction === 'forward' ? addDays(date, i) : subDays(date, i),
           'yyyy-MM-dd'
         );
         if (dayIndexMap[tryStr] !== undefined) return dayIndexMap[tryStr];
       }
       return -1;
     };

      return projectTasks.map(task => {
       if (!task.start_date) return null;

       // 正規化日期（移除時間戳記）
       const startDateStr = normalizeDate(task.start_date);
       const endDateStr = normalizeDate(task.end_date);
       if (!startDateStr) return null;

       // 開始日期：找當天或之後最近的可見日
       const startIdx = findVisibleIdx(startDateStr, 'forward');
       if (startIdx < 0) return null;

       let left, width, bgColor;

       if (task.time_type === 'milestone') {
         left = startIdx * CELL_WIDTH + CELL_WIDTH / 2 - 8;
         width = 'auto';
         bgColor = 'transparent';
       } else if (task.time_type === 'duration') {
         if (!endDateStr) return null;
         const endIdx = findVisibleIdx(endDateStr, 'backward');
         if (endIdx < 0) return null;
         left = startIdx * CELL_WIDTH + 2;
         width = (endIdx - startIdx + 1) * CELL_WIDTH - 4;
         bgColor = projectColor;
       } else if (task.time_type === 'rolling') {
         left = startIdx * CELL_WIDTH + 2;
         // rolling 用 days 的 total length
         const daysLength = days.length;
         width = (daysLength - startIdx) * CELL_WIDTH - 4;
         bgColor = projectColor;
       } else {
         return null;
       }

      const workingDays = task.time_type === 'duration' && startDateStr && endDateStr
        ? calculateWorkingDays(startDateStr, endDateStr)
        : 0;
       return (
      <div
         key={task.id}
         style={{
           position: 'absolute',
           top: '50%',
           transform: 'translateY(-50%)',
           left,
           width: width === 'auto' ? undefined : width,
           height: 28,
           borderRadius: 4,
           backgroundColor: bgColor,
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           overflow: 'hidden',
           whiteSpace: 'nowrap',
           pointerEvents: 'auto',
           opacity: 1,
           cursor: 'pointer',
           zIndex: 10,
           outline: 'none',
           outlineOffset: '0px',
           transition: 'outline 0.15s, transform 0.15s, z-index 0.15s',
         }}
         onClick={(e) => {
            e.stopPropagation();
            setEditingTask({ ...task });
            setShowEditTaskDialog(true);
          }}
       >
        {task.time_type === 'milestone' && (
          <div className="flex items-center gap-1 px-1">
            <div style={{
              width: 12, height: 12,
              transform: 'rotate(45deg)',
              backgroundColor: task.is_important ? '#eab308' : projectColor,
              flexShrink: 0,
              boxShadow: 'none',
              transition: 'box-shadow 0.15s',
            }} />
            <span style={{ fontSize: 14, color: textColor, fontWeight: 500 }}>
              {`${row.data.name} ${task.name}`}
            </span>
          </div>
        )}
       {task.time_type === 'duration' && (
         <span style={{ fontSize: 14, color: textColor, fontWeight: 500 }}>
           {`${row.data.name} ${task.name}`}
           {workingDays > 0 && (
             <span style={{ fontSize: 12, opacity: 0.8, marginLeft: 6 }}>
               ({workingDays}工作天)
             </span>
           )}
         </span>
       )}
       {task.time_type === 'rolling' && (
         <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
           <div style={{
             position: 'absolute',
             inset: 0,
             background: `linear-gradient(to right, ${getLightColor(projectColor)}, transparent)`,
             pointerEvents: 'none',
           }} />
           <span style={{ fontSize: 14, color: textColor, fontWeight: 500, position: 'relative', zIndex: 1 }}>
             {`${row.data.name} ${task.name}`}
           </span>
         </div>
       )}
       </div>
       );
       });
       }, [tasksByProjectId, dayIndexMap, CELL_WIDTH, days.length, addDays, subDays]);

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

  const projectForAddPhase = ganttProjects.find(p => p.id === creatingProjectId);
  const brandIdForAddPhase = projectForAddPhase?.brand_id;
  const samplesForPhaseSelection = (() => {
    if (!brandIdForAddPhase) return [];
    const allSamples = getSamplesByBrand(brandIdForAddPhase);
    // 排除已加入的樣品
    const existingPhases = ganttPhases.filter(p => p.gantt_project_id === creatingProjectId);
    const existingSampleIds = new Set(existingPhases.map(p => p.sample_id));
    return allSamples.filter(s => !existingSampleIds.has(s.id));
  })();

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
        projects={filteredBrands}
        selectedDeptId={selectedDeptId}
        onDeptChange={handleDeptChange}
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
                className="bg-gray-100 border-b border-gray-300 px-3 font-semibold text-sm flex items-center gap-2"
                style={{ height: DATE_HEADER_HEIGHT }}
              >
                開發季
                <button
                  onClick={() => setShowAddProjectDialog(true)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
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
                  <div key={row.id} className="border-b border-gray-200">
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
          <div className="flex-1 overflow-x-auto" data-gantt-scroll ref={(el) => { rightPanelRef.current = el; rightPanelContainerRef.current = el; }} onScroll={handleRightScroll} onWheel={handleRightWheel}>
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
                            fontSize: 13,
                            fontWeight: leaveStyle?.bold ? 700 : 500,
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
                          <PopoverContent className="min-w-[140px] p-2 text-xs" side="bottom" align="center">
                            {names.map(name => (
                              <p key={name} className="text-gray-800 py-0.5">{name}</p>
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
                      <div key={row.id} style={{ position: 'relative', borderBottom: '1px solid #e5e7eb', height: ROW_HEIGHT }}>
                        {/* 底層：格子背景 + 格線 */}
                        <div style={{ ...gridStyle, position: 'absolute', inset: 0 }}>
                          {days.map((day) => renderCellBackground(row, day))}
                        </div>
                        {/* 上層：Bar */}
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                          {renderTaskBars(row)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            </div>
            </div>
            </Card>

      {/* ===== Dialogs ===== */}



      <AddProjectDialog
        open={showAddProjectDialog}
        onOpenChange={setShowAddProjectDialog}
        projectFormData={projectFormData}
        setProjectFormData={setProjectFormData}
        projects={projects}
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
              let phaseIndex = 1;
              for (const task of result.tasks) {
                if (task.name.trim()) {
                  const phase = await base44.entities.GanttPhase.create({
                    gantt_project_id: creatingProjectId,
                    name: task.name.trim(),
                    sort_order: phaseIndex++,
                  });
                  await base44.entities.GanttTask.create({
                    gantt_phase_id: phase.id,
                    name: task.name.trim(),
                    sort_order: 1,
                    time_type: 'milestone',
                  });
                }
              }
              queryClient.invalidateQueries(['ganttPhases']);
              queryClient.invalidateQueries(['ganttTasks']);
              setShowImportScheduleDialog(false);
              setScheduleFile(null);
              setCreatingProjectId(null);
              setProjectCreationMode('manual');
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
        onCreateTask={(name) => {
          createGanttTask.mutate({
            name,
            gantt_project_id: editingProject.id,
            sort_order: editingProjectTasks.length + 1,
          }, {
            onSuccess: (newTask) => setEditingProjectTasks(prev => [...prev, newTask])
          });
        }}
        onSave={() => {
          updateGanttProject.mutate({ id: editingProject.id, data: { name: editingProject.name } });
          editingProjectTasks.forEach(task => {
            const original = ganttTasks.find(t => t.id === task.id);
            if (!original) return;

            const nameChanged = original.name !== task.name;
            const timeChanged =
              original.time_type !== task.time_type ||
              original.start_date !== task.start_date ||
              original.end_date !== task.end_date;

            if (nameChanged || timeChanged) {
              updateGanttTask.mutate({
                id: task.id,
                data: {
                  name: task.name,
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

      <AddPhaseDialog
        open={showAddPhaseDialog}
        onOpenChange={setShowAddPhaseDialog}
        projectName={projectForAddPhase?.name}
        samplesForSelection={samplesForPhaseSelection}
        selectedSamples={selectedSamples}
        setSelectedSamples={setSelectedSamples}
        onConfirm={handleAddPhase}
        isLoading={bulkCreatePhases.isPending}
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
                <Label>任務名稱 *</Label>
                <Input
                  value={editingTask.name}
                  onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div className="border-t pt-4">
                <Label className="mb-2 block text-gray-600">時間類型</Label>
                <div className="flex gap-1.5">
                  {[
                    { value: '', label: '不設定' },
                    { value: 'milestone', label: '◆ 里程碑' },
                    { value: 'duration', label: '▬ 區間' },
                    { value: 'rolling', label: '▶ Rolling' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditingTask({ ...editingTask, time_type: opt.value, start_date: '', end_date: '' })}
                      className={`flex-1 text-xs px-1.5 py-1.5 rounded border transition-colors ${
                        (editingTask.time_type || '') === opt.value
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

      <EditPhaseDialog
        open={showEditPhaseDialog}
        onOpenChange={setShowEditPhaseDialog}
        phase={editingPhase}
        phaseName={editingPhaseName}
        setPhaseName={setEditingPhaseName}
        phaseTasks={editingPhaseTasks}
        setPhaseTasks={setEditingPhaseTasks}
        newTaskName={newTaskName}
        setNewTaskName={setNewTaskName}
        onSave={() => {
          if (editingPhase && editingPhaseName.trim()) {
            updateGanttPhase.mutate({ id: editingPhase.id, data: { name: editingPhaseName.trim() } });
          }
          setShowEditPhaseDialog(false);
        }}
        onCreateTask={() => {
          if (!newTaskName.trim() || !editingPhase) return;
          createGanttTask.mutate({
            name: newTaskName.trim(),
            gantt_phase_id: editingPhase.id,
            sort_order: editingPhaseTasks.length + 1,
          }, {
            onSuccess: (newTask) => {
              setEditingPhaseTasks(prev => [...prev, newTask]);
              setNewTaskName('');
              queryClient.invalidateQueries(['ganttTasks']);
            }
          });
        }}
        onDeleteTask={(taskId) => {
          deleteGanttTask.mutate(taskId, {
            onSuccess: () => setEditingPhaseTasks(prev => prev.filter(t => t.id !== taskId))
          });
        }}
      />

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
             <li><strong>新增任務</strong>：滑鼠移到專案列名稱上，點擊 ＋ 按鈕新增任務</li>
             <li><strong>編輯/刪除任務</strong>：點擊任務 bar 直接開啟編輯對話框，或右鍵選單選擇編輯/刪除</li>
             <li><strong>設定日期</strong>：在編輯對話框中選擇時間類型（里程碑 ◆、區間 ▬、Rolling ▶）並填寫日期</li>
             <li><strong>橫向捲動</strong>：滑鼠滾輪或 Trackpad 可平滑捲動，每次移動約 1 格，支援月份快速跳轉按鈕</li>
           </ul>
        <div className="mt-3 ml-4">
          <p className="font-medium text-gray-700 mb-1">請假人數色碼：</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-5 rounded text-[11px] font-semibold bg-yellow-100 text-yellow-700">1人</span>
              <span>1–2 人請假</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-5 rounded text-[11px] font-semibold bg-orange-100 text-orange-700">3人</span>
              <span>3–4 人請假</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-5 rounded text-[11px] font-bold bg-red-100 text-red-700">5人</span>
              <span>5 人以上請假，需特別注意</span>
            </div>
            <p className="text-gray-400 text-xs mt-1">點擊數字可查看各部門請假人員名單</p>
          </div>
        </div>
      </details>
      </div>
    </TooltipProvider>
      );
      }