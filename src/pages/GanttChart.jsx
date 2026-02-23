import React, { useState, useMemo, useRef } from 'react';
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
import { addMonths, addDays, addWeeks, subDays, format, eachDayOfInterval, isToday, startOfWeek, getDay, isSameMonth, startOfMonth } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const ROW_HEIGHT = 40;

export default function GanttChart() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'quarter'

  const VIEW_CONFIG = {
    month:   { cellWidth: 40, label: '月' },
    quarter: { label: '季', unit: 'week' },
  };

  // 無限捲動：以 centerDate 為中心動態生成日期
  const [centerDate, setCenterDate] = useState(new Date());
  // 季視圖動態格寬
  const rightPanelContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  React.useEffect(() => {
    const el = rightPanelContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  
  // 選擇狀態
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [firstDate, setFirstDate] = useState(null);
  const [secondDate, setSecondDate] = useState(null);
  
  // Dialog 狀態
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [showRollingDialog, setShowRollingDialog] = useState(false);
  const [showImportScheduleDialog, setShowImportScheduleDialog] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);

  // 拖曳畫區間狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

  // 編輯任務狀態
  const [editingTask, setEditingTask] = useState(null);

  // Scroll refs
  const leftPanelRef = React.useRef(null);
  const rightPanelRef = React.useRef(null); // outer overflow-x-auto

  const [currentPhaseId, setCurrentPhaseId] = useState(null);
  const [creatingProjectId, setCreatingProjectId] = useState(null);
  const [projectCreationMode, setProjectCreationMode] = useState('manual'); // 'manual' or 'import'
  const [scheduleFile, setScheduleFile] = useState(null);
  const [isAnalyzingSchedule, setIsAnalyzingSchedule] = useState(false);

  // 表單資料
  const [projectFormData, setProjectFormData] = useState({ brand_id: '', season: '' });
  const [taskFormData, setTaskFormData] = useState({ name: '', is_important: false, note: '' });
  const [selectedSamples, setSelectedSamples] = useState({});

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
    queryKey: ['leaveRecords', leaveQueryStart, leaveQueryEnd, viewMode],
    queryFn: async () => {
      if (viewMode === 'quarter') return [];
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

  // Mutations
  const createGanttProject = useMutation({
    mutationFn: (data) => base44.entities.GanttProject.create(data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries(['ganttProjects']);
      setCreatingProjectId(newProject.id);
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
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttTasks']);
      setShowAddTaskDialog(false);
      setTaskFormData({ name: '', is_important: false, note: '' });
      setCurrentPhaseId(null);
    },
  });

  // Update task (with optimistic update for time changes)
  const updateTaskWithOptimistic = (id, data) => {
    const previousTasks = queryClient.getQueryData(['ganttTasks']);
    const newTasks = previousTasks?.map(task => 
      task.id === id ? { ...task, ...data } : task
    );
    queryClient.setQueryData(['ganttTasks'], newTasks);
    
    updateGanttTask.mutate({ id, data }, {
      onError: () => {
        queryClient.setQueryData(['ganttTasks'], previousTasks);
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

  // 清除選擇
  const clearSelection = () => {
    setSelectedTaskId(null);
    setFirstDate(null);
    setSecondDate(null);
  };

  // Get days based on viewMode (infinite scroll: center ± buffer)
  const days = useMemo(() => {
    if (viewMode === 'quarter') {
      const start = startOfWeek(subDays(centerDate, 45), { weekStartsOn: 1 });
      const weeks = [];
      for (let i = 0; i < 26; i++) {
        weeks.push(addWeeks(start, i));
      }
      return weeks;
    } else {
      const start = subDays(centerDate, 90);
      const end = addDays(centerDate, 180);
      return eachDayOfInterval({ start, end });
    }
  }, [centerDate, viewMode]);

  const CELL_WIDTH = useMemo(() => {
    if (viewMode === 'quarter') return Math.max(32, Math.floor(containerWidth / days.length));
    return VIEW_CONFIG[viewMode].cellWidth;
  }, [viewMode, containerWidth, days.length]);

  // 建立統一的 rows 陣列（兩層：project + phase，任務直接畫在 phase 列上）
  const rows = useMemo(() => {
    const result = [];
    ganttProjects.forEach((project) => {
      result.push({ type: 'project', data: project, id: `project-${project.id}` });
      ganttPhases
        .filter((p) => p.gantt_project_id === project.id)
        .forEach((phase) => {
          result.push({ type: 'phase', data: phase, id: `phase-${phase.id}` });
        });
    });
    return result;
  }, [ganttProjects, ganttPhases]);

  const leaveCountByDate = useMemo(() => {
    const map = {};
    leaveRecords.forEach(r => {
      if (!map[r.date]) map[r.date] = new Set();
      map[r.date].add(r.employee_id);
    });
    const result = {};
    Object.entries(map).forEach(([date, set]) => {
      result[date] = set.size;
    });
    return result;
  }, [leaveRecords]);

  const leaveNamesByDate = useMemo(() => {
    const map = {};
    leaveRecords.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      const emp = employees.find(e => e.id === r.employee_id);
      if (emp && !map[r.date].includes(emp.name)) map[r.date].push(emp.name);
    });
    return map;
  }, [leaveRecords, employees]);

  const getLeaveCountStyle = (count) => {
    if (!count) return null;
    if (count <= 2) return { bg: '#fef9c3', text: '#854d0e', label: `${count}人` };
    if (count <= 4) return { bg: '#ffedd5', text: '#9a3412', label: `${count}人` };
    return { bg: '#fee2e2', text: '#991b1b', label: `${count}人`, bold: true };
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

  // Handlers
  const handleAddProject = async () => {
    if (!projectFormData.brand_id || !projectFormData.season) return;

    const brand = projects.find((p) => p.id === projectFormData.brand_id);
    const name = `${brand.short_name || brand.name} ${projectFormData.season}`;

    if (projectCreationMode === 'import') {
      const newProject = await createGanttProject.mutateAsync({ ...projectFormData, name });
      setShowAddProjectDialog(false);
      setShowImportScheduleDialog(true);
      return;
    }

    // manual mode: create project then phases in one go
    const newProject = await createGanttProject.mutateAsync({ ...projectFormData, name });
    const selectedSampleIds = Object.keys(selectedSamples).filter((k) => selectedSamples[k]);
    if (selectedSampleIds.length > 0) {
      await bulkCreatePhases.mutateAsync(
        selectedSampleIds.map((sampleId, idx) => {
          const sample = samples.find((s) => s.id === sampleId);
          return {
            gantt_project_id: newProject.id,
            sample_id: sampleId,
            name: sample.short_name || sample.name,
            sort_order: idx + 1,
          };
        })
      );
    }
    setShowAddProjectDialog(false);
    setProjectFormData({ brand_id: '', season: '' });
    setSelectedSamples({});
    setProjectCreationMode('manual');
  };

  const handleAddTask = () => {
    if (!taskFormData.name || !currentPhaseId) return;

    const tasksInPhase = ganttTasks.filter((t) => t.gantt_phase_id === currentPhaseId);
    createGanttTask.mutate({
      ...taskFormData,
      gantt_phase_id: currentPhaseId,
      sort_order: tasksInPhase.length + 1,
    });
  };

  // 點擊任務
  const handleTaskClick = (taskId) => {
    if (selectedTaskId === taskId) {
      clearSelection();
    } else {
      setSelectedTaskId(taskId);
      setFirstDate(null);
      setSecondDate(null);
    }
  };

  // 點擊日期格子
  const handleDateClick = (date, taskId) => {
    if (selectedTaskId !== taskId) {
      setSelectedTaskId(taskId);
      setFirstDate(date);
      setSecondDate(null);
      return;
    }

    if (!firstDate) {
      setFirstDate(date);
      setSecondDate(null);
    } else if (!secondDate) {
      if (format(date, 'yyyy-MM-dd') === format(firstDate, 'yyyy-MM-dd')) {
        // 點擊同一天
      } else {
        setSecondDate(date);
      }
    } else {
      setFirstDate(date);
      setSecondDate(null);
    }
  };

  // Esc 鍵取消選擇
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rightBodyRef = useRef(null);

  // 同步垂直滾動：左側 panel ↔ 右側 body
  React.useEffect(() => {
    const left = leftPanelRef.current;
    const right = rightBodyRef.current;
    if (!left || !right) return;

    const onLeft = () => { right.scrollTop = left.scrollTop; };
    const onRight = () => { left.scrollTop = right.scrollTop; };

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

  // 捲動時延伸 buffer + 更新 visibleMonth
  const handleRightScroll = React.useCallback((e) => {
    const el = e.currentTarget;
    // 更新可見月份
    const scrolledDays = Math.floor(el.scrollLeft / CELL_WIDTH);
    if (days[scrolledDays]) setVisibleMonth(days[scrolledDays]);
    // 靠近右端：往右延伸
    if (el.scrollWidth - el.scrollLeft - el.clientWidth < CELL_WIDTH * 30) {
      setCenterDate(d => addDays(d, 30));
    }
    // 靠近左端：往左延伸
    if (el.scrollLeft < CELL_WIDTH * 30) {
      const prevScrollLeft = el.scrollLeft;
      setCenterDate(d => {
        // 延伸後補償 scrollLeft
        requestAnimationFrame(() => {
          el.scrollLeft = prevScrollLeft + 30 * CELL_WIDTH;
        });
        return subDays(d, 30);
      });
    }
  }, [days, CELL_WIDTH]);

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

  // 右鍵選單 handlers
  const handleSetMilestone = (taskId, date) => {
    updateTaskWithOptimistic(taskId, { 
      time_type: 'milestone', 
      start_date: format(date, 'yyyy-MM-dd'), 
      end_date: null 
    });
  };

  const handleSetRolling = (taskId, date) => {
    updateTaskWithOptimistic(taskId, { 
      time_type: 'rolling', 
      start_date: format(date, 'yyyy-MM-dd'), 
      end_date: null 
    });
  };

  const handleClearTime = (taskId) => {
    updateTaskWithOptimistic(taskId, { 
      time_type: null, 
      start_date: null, 
      end_date: null 
    });
  };

  // 拖曳畫區間的判斷
  const isInDragRange = (task, dateStr) => {
    if (!isDragging || dragTaskId !== task.id || !dragStart || !dragEnd) return false;
    const s = format(dragStart < dragEnd ? dragStart : dragEnd, 'yyyy-MM-dd');
    const e = format(dragStart < dragEnd ? dragEnd : dragStart, 'yyyy-MM-dd');
    return dateStr >= s && dateStr <= e;
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
    const [, destType, destParentId] = destination.droppableId.split('-');

    // 需要同一層級拖曳
    if (source.droppableId !== destination.droppableId) return;

    const [, sourceType] = source.droppableId.split('-');
    const [, rowType, rowId] = draggableId.split('-');

    // 取得該層的所有項目
    let items = [];
    if (sourceType === 'project') {
      items = ganttProjects;
    } else if (sourceType === 'phase') {
      items = ganttPhases.filter(p => p.gantt_project_id === destParentId);
    } else if (sourceType === 'task') {
      items = ganttTasks.filter(t => {
        const phase = ganttPhases.find(ph => ph.id === destParentId);
        return t.gantt_phase_id === destParentId;
      });
    }

    // 新排序
    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(source.index, 1);
    reorderedItems.splice(destination.index, 0, movedItem);

    // 批量更新
    reorderedItems.forEach((item, idx) => {
      if (item.sort_order !== idx) {
        updateSortOrder.mutate({
          id: item.id,
          entityType: sourceType,
          sortOrder: idx,
        });
      }
    });
  };

  // 渲染左側單元格
  const renderLeftCell = (row, isDragging) => {
    if (row.type === 'project') {
      return (
        <div
          className={`group flex items-center gap-2 px-3 font-bold text-sm ${isDragging ? 'bg-blue-700 text-white' : 'bg-gray-800 text-white hover:bg-gray-900'}`}
          style={{ height: ROW_HEIGHT }}
        >
          <GripVertical className="w-4 h-4 flex-shrink-0 opacity-60" />
          <span className="truncate flex-1">{row.data.name}</span>
          <div className="hidden group-hover:flex gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setEditingProject(row.data); setShowEditProjectDialog(true); }}
              className="p-1 hover:bg-gray-600 rounded"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (window.confirm(`確定要刪除「${row.data.name}」嗎？`)) deleteGanttProject.mutate(row.data.id); }}
              className="p-1 hover:bg-red-700 rounded"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }

    if (row.type === 'phase') {
      const phaseTasks = ganttTasks.filter(t => t.gantt_phase_id === row.data.id);
      return (
        <div
          className={`group flex items-center gap-2 px-3 pl-8 bg-gray-100 ${isDragging ? 'bg-blue-100' : ''} font-medium text-sm text-gray-800`}
          style={{ height: ROW_HEIGHT }}
        >
          <GripVertical className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <span className="truncate flex-1">{row.data.name}</span>
          {phaseTasks.length > 0 && (
            <span className="text-xs text-gray-400 font-normal flex-shrink-0">{phaseTasks.length}個任務</span>
          )}
          <div className="hidden group-hover:flex gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPhaseId(row.data.id);
                setTaskFormData({ name: '', is_important: false, note: '' });
                setShowAddTaskDialog(true);
              }}
              className="p-1 hover:bg-gray-300 rounded"
              title="新增任務"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }
  };

  // 渲染右側單元格
  const renderRightCell = (row, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    // 季模式：這個 cell 代表一整週 (day = 週一)
    const weekEndStr = viewMode === 'quarter' ? format(addDays(day, 6), 'yyyy-MM-dd') : dateStr;

    const isFirstSelected = selectedTaskId === row.data?.id && firstDate && format(firstDate, 'yyyy-MM-dd') === dateStr;
    const isSecondSelected = selectedTaskId === row.data?.id && secondDate && format(secondDate, 'yyyy-MM-dd') === dateStr;
    const isSelected = isFirstSelected || isSecondSelected;

    // 專案列
    if (row.type === 'project') {
      return (
        <div
          key={dateStr}
          className="border-r border-gray-200 bg-gray-200"
          style={{ width: CELL_WIDTH, height: ROW_HEIGHT }}
        />
      );
    }

    // 階段列：直接渲染該 phase 底下所有任務的 bar/milestone
    if (row.type === 'phase') {
      const phaseTasks = ganttTasks.filter(t => t.gantt_phase_id === row.data.id);

      const renderTaskBar = (task) => {
        const taskStartDate = task.start_date;
        const taskEndDate = task.end_date;
        const isStart = viewMode === 'quarter'
          ? taskStartDate && taskStartDate >= dateStr && taskStartDate <= weekEndStr
          : taskStartDate === dateStr;
        const isEnd = viewMode === 'quarter'
          ? taskEndDate && taskEndDate >= dateStr && taskEndDate <= weekEndStr
          : taskEndDate === dateStr;
        const isInRange =
          task.time_type === 'duration' && taskStartDate && taskEndDate &&
          (viewMode === 'quarter'
            ? dateStr <= taskEndDate && weekEndStr >= taskStartDate
            : dateStr >= taskStartDate && dateStr <= taskEndDate);
        const isRolling =
          task.time_type === 'rolling' && taskStartDate &&
          (viewMode === 'quarter' ? weekEndStr >= taskStartDate : dateStr >= taskStartDate);

        const isSelectedTask = selectedTaskId === task.id;
        const isFirstSel = isSelectedTask && firstDate && format(firstDate, 'yyyy-MM-dd') === dateStr;
        const isSecondSel = isSelectedTask && secondDate && format(secondDate, 'yyyy-MM-dd') === dateStr;

        let tooltipText = '';
        if (task.time_type === 'milestone' && isStart) tooltipText = `◆ ${task.name}: ${taskStartDate}`;
        else if (task.time_type === 'duration' && isInRange) tooltipText = `▬ ${task.name}: ${taskStartDate} → ${taskEndDate}`;
        else if (task.time_type === 'rolling' && isRolling) tooltipText = `▶ ${task.name}: ${taskStartDate}~`;

        const hasVisual = (task.time_type === 'milestone' && isStart) ||
          (task.time_type === 'duration' && isInRange) ||
          (task.time_type === 'rolling' && isRolling);

        if (!hasVisual && !isFirstSel && !isSecondSel) return null;

        return (
          <TooltipProvider key={task.id} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTaskId(task.id);
                    if (hasVisual) {
                      setShowMilestoneDialog(task.time_type === 'milestone');
                      setShowDurationDialog(task.time_type === 'duration');
                      setShowRollingDialog(task.time_type === 'rolling');
                    } else {
                      handleDateClick(day, task.id);
                    }
                  }}
                  onContextMenu={(e) => e.stopPropagation()}
                >
                  {/* 里程碑 ◆ */}
                  {task.time_type === 'milestone' && isStart && (
                    <div className={`w-3.5 h-3.5 transform rotate-45 z-10 ${task.is_important ? 'bg-yellow-500' : isSelectedTask ? 'bg-blue-700' : 'bg-blue-500'}`} />
                  )}
                  {/* 區間 ████ */}
                  {task.time_type === 'duration' && isInRange && (
                    <div className={`absolute top-1/2 h-3 transform -translate-y-1/2 z-10 ${isSelectedTask ? 'bg-blue-600' : 'bg-blue-400'} ${
                      isStart && isEnd ? 'left-2 right-2 rounded' :
                      isStart ? 'left-2 right-0 rounded-l' :
                      isEnd ? 'left-0 right-2 rounded-r' :
                      'left-0 right-0'
                    }`} />
                  )}
                  {/* Rolling */}
                  {task.time_type === 'rolling' && isRolling && (
                    <div className={`absolute top-1/2 h-3 transform -translate-y-1/2 z-10 ${
                      isStart
                        ? 'left-2 right-0 bg-gradient-to-r from-purple-500 to-purple-300 rounded-l'
                        : 'left-0 right-0 bg-purple-300'
                    }`} />
                  )}
                  {/* 選中標記 */}
                  {isFirstSel && !isSecondSel && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-bl font-bold z-20">1</div>
                  )}
                  {isSecondSel && (
                    <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-bl font-bold z-20">2</div>
                  )}
                </div>
              </TooltipTrigger>
              {tooltipText && (
                <TooltipContent side="top" className="text-xs max-w-48">
                  {tooltipText}
                  {task.note && <div className="text-gray-400 mt-0.5">{task.note}</div>}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      };

      const hasDragOnPhase = isDragging && phaseTasks.some(t => t.id === dragTaskId);
      const isInDragRangePhase = hasDragOnPhase && dragStart && dragEnd && (() => {
        const s = format(dragStart < dragEnd ? dragStart : dragEnd, 'yyyy-MM-dd');
        const e = format(dragStart < dragEnd ? dragEnd : dragStart, 'yyyy-MM-dd');
        return dateStr >= s && dateStr <= e;
      })();

      const selectedPhaseTask = phaseTasks.find(t => t.id === selectedTaskId);

      return (
        <ContextMenu key={dateStr}>
          <ContextMenuTrigger asChild>
            <div
              className={`border-r border-gray-200 relative bg-gray-100 cursor-pointer hover:bg-yellow-50 transition-colors ${
                selectedPhaseTask ? 'bg-blue-50' : ''
              } ${isInDragRangePhase ? 'bg-blue-200' : ''}`}
              style={{ width: CELL_WIDTH, height: ROW_HEIGHT }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                // 拖曳畫區間：需要先有選中任務
                if (selectedTaskId && phaseTasks.some(t => t.id === selectedTaskId)) {
                  setIsDragging(true);
                  setDragTaskId(selectedTaskId);
                  setDragStart(day);
                  setDragEnd(day);
                }
              }}
              onMouseEnter={() => {
                if (isDragging && phaseTasks.some(t => t.id === dragTaskId)) {
                  setDragEnd(day);
                }
              }}
              onMouseUp={() => {
                if (!isDragging || !dragTaskId) return;
                let start = dragStart < dragEnd ? dragStart : dragEnd;
                let end = dragStart < dragEnd ? dragEnd : dragStart;
                if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
                  updateTaskWithOptimistic(dragTaskId, { time_type: 'milestone', start_date: format(start, 'yyyy-MM-dd'), end_date: null });
                } else {
                  updateTaskWithOptimistic(dragTaskId, { time_type: 'duration', start_date: format(start, 'yyyy-MM-dd'), end_date: format(end, 'yyyy-MM-dd') });
                }
                setIsDragging(false);
                setDragTaskId(null);
              }}
              onClick={() => {
                if (isDragging) return;
                if (selectedPhaseTask) {
                  handleDateClick(day, selectedPhaseTask.id);
                }
              }}
            >
              {/* 今天標記 */}
              {isToday(day) && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 z-20" />}
              {/* 所有任務 bars */}
              {phaseTasks.map(task => renderTaskBar(task))}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {phaseTasks.length === 0 && (
              <ContextMenuItem disabled className="text-gray-400 text-xs">此 Phase 尚無任務</ContextMenuItem>
            )}
            {phaseTasks.map(task => (
              <React.Fragment key={task.id}>
                <ContextMenuItem className="font-medium text-xs text-gray-500 cursor-default" disabled>{task.name}</ContextMenuItem>
                <ContextMenuItem onClick={() => handleSetMilestone(task.id, day)} className="pl-4">
                  <Diamond className="w-3 h-3 mr-2" /> 設為里程碑
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleSetRolling(task.id, day)} className="pl-4">
                  <Repeat className="w-3 h-3 mr-2" /> 設為 Rolling
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleClearTime(task.id)} className="pl-4">
                  <X className="w-3 h-3 mr-2" /> 清除時間
                </ContextMenuItem>
              </React.Fragment>
            ))}
          </ContextMenuContent>
        </ContextMenu>
      );
    }
  };

  // 取得排序後的日期
  const getSortedDates = () => {
    if (!firstDate) return { start: null, end: null };
    if (!secondDate) return { start: firstDate, end: firstDate };
    
    if (secondDate < firstDate) {
      return { start: secondDate, end: firstDate };
    }
    return { start: firstDate, end: secondDate };
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">專案甘特圖</h1>
        <Button
          onClick={() => setShowAddProjectDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增開發季
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>上月</Button>
        <span className="font-semibold text-lg">{format(currentMonth, 'yyyy年MM月')}</span>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>下月</Button>
        <div className="flex rounded-md border border-gray-200 overflow-hidden ml-2">
          {Object.entries(VIEW_CONFIG).map(([mode, cfg]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium border-r border-gray-200 last:border-0 transition-colors ${
                viewMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      {selectedTaskId && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">選中任務：</span>
              <span className="text-blue-700 font-semibold">{getSelectedTaskName()}</span>
              <button onClick={clearSelection} className="ml-1 text-gray-400 hover:text-gray-600 text-xs underline">取消選取</button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">已選日期：</span>
              {firstDate ? (
                <span className="bg-blue-100 px-2 py-1 rounded text-blue-800">
                  {format(firstDate, 'MM/dd')}
                </span>
              ) : (
                <span className="text-gray-400">點擊格子選擇第一個日期</span>
              )}
              {secondDate && (
                <>
                  <span className="text-gray-500">→</span>
                  <span className="bg-green-100 px-2 py-1 rounded text-green-800">
                    {format(secondDate, 'MM/dd')}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-200">
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setShowMilestoneDialog(true)}
                disabled={!firstDate}
              >
                <Diamond className="w-3 h-3" />
                里程碑
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setShowDurationDialog(true)}
                disabled={!firstDate}
              >
                <ArrowRight className="w-3 h-3" />
                區間
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setShowRollingDialog(true)}
                disabled={!firstDate}
              >
                <Repeat className="w-3 h-3" />
                Rolling
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
              >
                取消
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Gantt Chart */}
      <Card className="overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex">
            {/* Left Panel */}
            <div className="w-64 flex-shrink-0 border-r border-gray-300">
              <div
                className="bg-gray-100 border-b border-gray-300 px-3 font-semibold text-sm flex items-center"
                style={{ height: ROW_HEIGHT }}
              >
                專案名稱
              </div>
              <div
                className="bg-white border-b border-gray-300 px-3 text-xs text-gray-500 flex items-center font-medium"
                style={{ height: 28 }}
              >
                請假人數
              </div>
              <Droppable droppableId="droppable-project" type="PROJECT">
                {(provided, snapshot) => (
                  <div
                    className="overflow-y-auto"
                    style={{ maxHeight: 'calc(100vh - 440px)' }}
                    ref={(el) => {
                      provided.innerRef(el);
                      leftPanelRef.current = el;
                    }}
                    {...provided.droppableProps}
                  >
                    {rows.map((row, idx) => {
                      // 只在該項有效位置時才渲染 Draggable
                      const parentId = row.type === 'phase' ? row.data.gantt_project_id : row.type === 'task' ? rows.find(r => r.id === `phase-${row.data.gantt_phase_id}`)?.data.gantt_project_id : null;
                      const droppableId = row.type === 'project' ? 'droppable-project' : row.type === 'phase' ? `droppable-phase-${parentId}` : `droppable-task-${row.data.gantt_phase_id}`;

                      return (
                        <Draggable key={row.id} draggableId={row.id} index={idx} type={row.type.toUpperCase()}>
                          {(provided, snapshot) => (
                            <div
                              className="border-b border-gray-200"
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              {renderLeftCell(row, snapshot.isDragging)}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {rows.length === 0 && (
                      <div className="p-8 text-center text-gray-400">
                        點擊「新增開發季」開始
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

          {/* Right Panel */}
          <div className="flex-1 overflow-x-auto" ref={(el) => { rightPanelRef.current = el; rightPanelContainerRef.current = el; }}>
            {/* 日期 header */}
            <div className="flex bg-gray-100 border-b border-gray-300" style={{ height: viewMode === 'month' ? ROW_HEIGHT + 14 : ROW_HEIGHT }}>
              {days.map((day) => {
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                return (
                  <div
                    key={day.toISOString()}
                    className={`flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center gap-0.5 ${
                      isToday(day) ? 'bg-red-100 text-red-700' : 'text-gray-700'
                    }`}
                    style={{ width: CELL_WIDTH }}
                  >
                    {viewMode === 'quarter' ? (
                      <>
                        <span className="text-xs font-semibold leading-none">{format(day, 'M/d')}</span>
                        <span className="text-[9px] text-gray-400 leading-none">週</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-semibold leading-none">{format(day, 'd')}</span>
                        <span className={`text-[9px] leading-none ${isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
                          {format(day, 'EEE', { locale: zhTW })}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {/* 請假人數列 */}
            <div className="flex border-b border-gray-300 bg-white">
              {days.map((day) => {
                // 季模式：空白格，不顯示請假人數
                if (viewMode === 'quarter') {
                  return (
                    <div
                      key={day.toISOString()}
                      className="flex-shrink-0 border-r border-gray-200"
                      style={{ width: CELL_WIDTH, height: 28 }}
                    />
                  );
                }
                const dateStr = format(day, 'yyyy-MM-dd');
                const count = leaveCountByDate[dateStr] || 0;
                const leaveStyle = getLeaveCountStyle(count);
                const names = leaveNamesByDate[dateStr] || [];
                const cell = (
                  <div
                    key={day.toISOString()}
                    className="flex-shrink-0 border-r border-gray-200 flex items-center justify-center"
                    style={{
                      width: CELL_WIDTH,
                      height: 28,
                      backgroundColor: leaveStyle?.bg || 'transparent',
                      fontSize: 11,
                      fontWeight: leaveStyle?.bold ? 700 : 500,
                      color: leaveStyle?.text || '#d1d5db',
                      cursor: count ? 'pointer' : 'default',
                    }}
                  >
                    {leaveStyle?.label || ''}
                  </div>
                );
                if (!count) return cell;
                return (
                  <Popover key={day.toISOString()}>
                    <PopoverTrigger asChild>{cell}</PopoverTrigger>
                    <PopoverContent className="w-40 p-2 text-xs" side="bottom" align="center">
                      <div className="font-semibold mb-1 text-gray-700">{format(day, 'MM/dd')} 請假</div>
                      {names.map((n, i) => <div key={i} className="text-gray-600">{n}</div>)}
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
              onMouseLeave={() => {
                if (isDragging) {
                  setIsDragging(false);
                  setDragTaskId(null);
                }
              }}
            >
              {rows.map((row) => (
                <div key={row.id} className="flex border-b border-gray-200">
                  {days.map((day) => renderRightCell(row, day))}
                </div>
              ))}
            </div>
          </div>
          </div>
        </DragDropContext>
      </Card>

      {/* ===== Dialogs ===== */}

      {/* 里程碑確認 Dialog */}
      <Dialog open={showMilestoneDialog} onOpenChange={setShowMilestoneDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Diamond className="w-5 h-5 text-blue-500" />
              設定里程碑
            </DialogTitle>
            <DialogDescription>
              將此任務設為單一時間點的里程碑
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">任務名稱</span>
              <span className="font-medium">{getSelectedTaskName()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">日期</span>
              <span className="font-medium text-blue-600">
                {firstDate && format(firstDate, 'yyyy/MM/dd')}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={() => {
                updateTaskWithOptimistic(selectedTaskId, { 
                  time_type: null, 
                  start_date: null, 
                  end_date: null 
                });
                setShowMilestoneDialog(false);
              }}
            >
              清除時間
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowMilestoneDialog(false)}>
                取消
              </Button>
              <Button onClick={handleConfirmMilestone} className="bg-blue-600 hover:bg-blue-700">
                確認
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 區間確認 Dialog */}
      <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-blue-500" />
              設定時間區間
            </DialogTitle>
            <DialogDescription>
              設定任務的開始和結束日期
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">任務名稱</span>
              <span className="font-medium">{getSelectedTaskName()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">開始日期</span>
              <span className="font-medium text-blue-600">
                {firstDate && format(getSortedDates().start, 'yyyy/MM/dd')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">結束日期</span>
              <span className="font-medium text-green-600">
                {secondDate 
                  ? format(getSortedDates().end, 'yyyy/MM/dd')
                  : firstDate && format(firstDate, 'yyyy/MM/dd') + ' (同一天)'
                }
              </span>
            </div>
            {!secondDate && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                💡 提示：可以在甘特圖上點選第二個日期來設定區間範圍
              </p>
            )}
          </div>
          <DialogFooter>
            <Button 
             variant="destructive" 
             onClick={() => {
               updateTaskWithOptimistic(selectedTaskId, { 
                 time_type: null, 
                 start_date: null, 
                 end_date: null 
               });
               setShowDurationDialog(false);
             }}
            >
              清除時間
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDurationDialog(false)}>
                取消
              </Button>
              <Button onClick={handleConfirmDuration} className="bg-blue-600 hover:bg-blue-700">
                確認
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rolling 確認 Dialog */}
      <Dialog open={showRollingDialog} onOpenChange={setShowRollingDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-purple-500" />
              設定 Rolling
            </DialogTitle>
            <DialogDescription>
              從指定日期開始持續進行的任務
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">任務名稱</span>
              <span className="font-medium">{getSelectedTaskName()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">開始日期</span>
              <span className="font-medium text-purple-600">
                {firstDate && format(firstDate, 'yyyy/MM/dd')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">結束日期</span>
              <span className="text-gray-400">持續進行 →</span>
            </div>
          </div>
          <DialogFooter>
            <Button 
             variant="destructive" 
             onClick={() => {
               updateTaskWithOptimistic(selectedTaskId, { 
                 time_type: null, 
                 start_date: null, 
                 end_date: null 
               });
               setShowRollingDialog(false);
             }}
            >
              清除時間
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRollingDialog(false)}>
                取消
              </Button>
              <Button onClick={handleConfirmRolling} className="bg-purple-600 hover:bg-purple-700">
                確認
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Project Dialog (single-page form) */}
      <Dialog open={showAddProjectDialog} onOpenChange={(open) => {
        if (!open) { setProjectFormData({ brand_id: '', season: '' }); setSelectedSamples({}); setProjectCreationMode('manual'); }
        setShowAddProjectDialog(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增開發季</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>品牌 *</Label>
                <Select
                  value={projectFormData.brand_id}
                  onValueChange={(v) => { setProjectFormData({ ...projectFormData, brand_id: v }); setSelectedSamples({}); }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="選擇品牌..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.short_name || p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>季節 *</Label>
                <Select
                  value={projectFormData.season}
                  onValueChange={(v) => setProjectFormData({ ...projectFormData, season: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="選擇季節..." />
                  </SelectTrigger>
                  <SelectContent>
                    {['SS25','FW25','HO25','SS26','FW26','HO26','SS27','FW27'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {projectFormData.brand_id && projectFormData.season && (
              <div className="text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded border">
                專案名稱：<strong>{getBrandName(projectFormData.brand_id)} {projectFormData.season}</strong>
              </div>
            )}

            <div className="border-t pt-4">
              <Label className="mb-2 block">建立方式</Label>
              <div className="flex gap-2">
                <Button type="button" variant={projectCreationMode === 'manual' ? 'default' : 'outline'} className="flex-1" onClick={() => setProjectCreationMode('manual')}>
                  📝 手動選擇樣品
                </Button>
                <Button type="button" variant={projectCreationMode === 'import' ? 'default' : 'outline'} className="flex-1" onClick={() => setProjectCreationMode('import')}>
                  📎 上傳時程表
                </Button>
              </div>
            </div>

            {projectCreationMode === 'manual' && projectFormData.brand_id && (
              <div>
                <Label className="mb-2 block">選擇樣品階段</Label>
                {getSamplesByBrand(projectFormData.brand_id).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-3">此品牌沒有樣品，請先到「專案設定」新增</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                      {getSamplesByBrand(projectFormData.brand_id).map((sample) => (
                        <label key={sample.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${selectedSamples[sample.id] ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            checked={selectedSamples[sample.id] || false}
                            onChange={(e) => setSelectedSamples((prev) => ({ ...prev, [sample.id]: e.target.checked }))}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{sample.short_name || sample.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">已選 {Object.values(selectedSamples).filter(Boolean).length} 個（可以不選，之後再手動新增）</p>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProjectDialog(false)}>取消</Button>
            <Button
              onClick={handleAddProject}
              disabled={!projectFormData.brand_id || !projectFormData.season || createGanttProject.isPending || bulkCreatePhases.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {(createGanttProject.isPending || bulkCreatePhases.isPending) ? '建立中...' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Schedule Dialog */}
      <Dialog open={showImportScheduleDialog} onOpenChange={setShowImportScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上傳時程表</DialogTitle>
            <DialogDescription>
              上傳時程表圖片或 PDF，AI 將自動辨識階段和任務
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setScheduleFile(e.target.files?.[0] || null)}
                className="hidden"
                id="schedule-file-input"
              />
              <label htmlFor="schedule-file-input" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">點擊或拖曳檔案到此處</p>
                <p className="text-xs text-gray-400 mt-1">支援 PNG, JPG, PDF</p>
              </label>
              {scheduleFile && (
                <p className="mt-3 text-sm text-green-600">✓ {scheduleFile.name}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportScheduleDialog(false);
              setScheduleFile(null);
            }}>
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!scheduleFile || !creatingProjectId) return;
                setIsAnalyzingSchedule(true);
                try {
                  const { file_url } = await uploadScheduleFile.mutateAsync(scheduleFile);
                  const result = await analyzeSchedule.mutateAsync(file_url);

                  if (result && result.tasks && result.tasks.length > 0) {
                    // 建立階段和任務
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
              disabled={!scheduleFile || isAnalyzingSchedule}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzingSchedule ? '分析中...' : '開始辨識'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={showEditProjectDialog} onOpenChange={setShowEditProjectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>編輯開發季名稱</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>專案名稱</Label>
              <Input
                value={editingProject?.name || ''}
                onChange={(e) => setEditingProject(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProjectDialog(false)}>取消</Button>
            <Button
              onClick={() => {
                if (editingProject) {
                  updateGanttProject.mutate({ id: editingProject.id, data: { name: editingProject.name } });
                }
                setShowEditProjectDialog(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditTaskDialog} onOpenChange={setShowEditTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯任務</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>任務名稱</Label>
              <Input 
                value={taskFormData.name} 
                onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={taskFormData.is_important} 
                onChange={(e) => setTaskFormData({ ...taskFormData, is_important: e.target.checked })}
                className="w-4 h-4"
              />
              <span>標記為重要（黃色里程碑）</span>
            </label>
            <div>
              <Label>備註</Label>
              <Input 
                value={taskFormData.note} 
                onChange={(e) => setTaskFormData({ ...taskFormData, note: e.target.value })}
                placeholder="選填"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTaskDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              if (editingTask) {
                updateGanttTask.mutate({ 
                  id: editingTask.id, 
                  data: taskFormData
                });
              }
              setShowEditTaskDialog(false);
            }} className="bg-blue-600 hover:bg-blue-700">
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增任務</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>任務名稱 *</Label>
              <Input
                value={taskFormData.name}
                onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
                placeholder="例：SPR raised in Centric"
                className="mt-1"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={taskFormData.is_important}
                onChange={(e) => setTaskFormData({ ...taskFormData, is_important: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm">標記為重要（黃色里程碑）</span>
            </label>
            <div>
              <Label>備註</Label>
              <Input
                value={taskFormData.note}
                onChange={(e) => setTaskFormData({ ...taskFormData, note: e.target.value })}
                placeholder="選填"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleAddTask}
              disabled={!taskFormData.name}
              className="bg-blue-600 hover:bg-blue-700"
            >
              新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 操作說明 */}
      <details className="mt-4 text-sm text-gray-600">
        <summary className="cursor-pointer font-medium">📖 操作說明</summary>
        <ul className="mt-2 ml-4 space-y-1 list-disc">
          <li>每個「樣品列」直接顯示所有任務的 bar 和里程碑</li>
          <li>先從 Toolbar 選中任務，再拖曳格子畫出時間區間</li>
          <li>右鍵點格子，可針對各任務快速設定里程碑/Rolling/清除時間</li>
          <li>滑鼠移到樣品列名稱上可新增任務（＋按鈕）</li>
          <li>Hover 在任務 bar 上可看到 tooltip 顯示任務名與日期</li>
        </ul>
      </details>
      </div>
      );
      }