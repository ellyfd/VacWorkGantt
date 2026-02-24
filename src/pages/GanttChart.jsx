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

const ROW_HEIGHT = 40;

export default function GanttChart() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'quarter'

  const VIEW_CONFIG = {
    month: { cellWidth: 40, label: '月' },
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
  
  // 畫日期模式
  const [drawingMode, setDrawingMode] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);
  
  // Dialog 狀態
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [showRollingDialog, setShowRollingDialog] = useState(false);
  const [showImportScheduleDialog, setShowImportScheduleDialog] = useState(false);

  // 拖曳畫區間狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

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
  const [taskFormData, setTaskFormData] = useState({ name: '', is_important: false, note: '', time_type: '', start_date: '', end_date: '' });
  const [selectedSamples, setSelectedSamples] = useState({});

  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);

  // Edit Phase Dialog state
  const [showEditPhaseDialog, setShowEditPhaseDialog] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [editingPhaseName, setEditingPhaseName] = useState('');
  const [editingPhaseTasks, setEditingPhaseTasks] = useState([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [showAddPhaseDialog, setShowAddPhaseDialog] = useState(false);

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

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list('sort_order'),
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
    onSuccess: (newTask) => {
      queryClient.invalidateQueries(['ganttTasks']);
      setShowAddTaskDialog(false);
      setTaskFormData({ name: '', is_important: false, note: '', time_type: '', start_date: '', end_date: '' });
      setCurrentPhaseId(null);
      // 只有沒填時間才進入畫日期模式
      if (!newTask.time_type) {
        setSelectedTaskId(newTask.id);
        setDrawingMode(true);
        setPendingTask(newTask);
        setFirstDate(null);
        setSecondDate(null);
      }
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

  const deleteGanttPhase = useMutation({
    mutationFn: async (phaseId) => {
      const phaseTasks = ganttTasks.filter(t => t.gantt_phase_id === phaseId);
      await Promise.all(phaseTasks.map(t => base44.entities.GanttTask.delete(t.id)));
      await base44.entities.GanttPhase.delete(phaseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttPhases']);
      queryClient.invalidateQueries(['ganttTasks']);
    },
  });

  const updateGanttPhase = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GanttPhase.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['ganttPhases']),
  });

  // 清除選擇
  const clearSelection = () => {
    setSelectedTaskId(null);
    setFirstDate(null);
    setSecondDate(null);
    setDrawingMode(false);
    setPendingTask(null);
  };

  // Get days based on viewMode (infinite scroll: center ± buffer)
  const days = useMemo(() => {
    const start = subDays(centerDate, 90);
    const end = addDays(centerDate, 180);
    return eachDayOfInterval({ start, end });
  }, [centerDate]);

  const CELL_WIDTH = VIEW_CONFIG.month.cellWidth;

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

  const filteredLeaveRecords = useMemo(() => {
    if (!selectedDeptId) return leaveRecords;
    const deptEmployeeIds = new Set(
      employees
        .filter(emp => (emp.department_ids || []).includes(selectedDeptId))
        .map(emp => emp.id)
    );
    return leaveRecords.filter(r => deptEmployeeIds.has(r.employee_id));
  }, [leaveRecords, selectedDeptId, employees]);

  const visibleRows = useMemo(() => {
    const visibleProjectIds = new Set(
      ganttProjects
        .filter(project => {
          if (selectedBrandIds.length > 0 && !selectedBrandIds.includes(project.brand_id)) return false;
          return true;
        })
        .map(p => p.id)
    );
    return rows.filter(row => {
      if (row.type === 'project') return visibleProjectIds.has(row.data.id);
      if (row.type === 'phase') return visibleProjectIds.has(row.data.gantt_project_id);
      return true;
    });
  }, [rows, ganttProjects, selectedBrandIds]);

  const leaveCountByDate = useMemo(() => {
    const map = {};
    filteredLeaveRecords.forEach(r => {
      if (!map[r.date]) map[r.date] = new Set();
      map[r.date].add(r.employee_id);
    });
    const result = {};
    Object.entries(map).forEach(([date, set]) => {
      result[date] = set.size;
    });
    return result;
  }, [filteredLeaveRecords]);

  const leaveNamesByDate = useMemo(() => {
    const map = {};
    filteredLeaveRecords.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      if (!map[r.date].find(e => e.employeeId === r.employee_id)) {
        map[r.date].push({ employeeId: r.employee_id });
      }
    });
    return map;
  }, [filteredLeaveRecords]);

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
      const newProject = await createGanttProject.mutateAsync({ ...projectFormData, name, created_by: currentUser?.id });
      setShowAddProjectDialog(false);
      setShowImportScheduleDialog(true);
      return;
    }

    // manual mode: create project then phases in one go
    const newProject = await createGanttProject.mutateAsync({ ...projectFormData, name, created_by: currentUser?.id });
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
    if (!taskFormData.name || !currentPhaseId) return;

    const tasksInPhase = ganttTasks.filter((t) => t.gantt_phase_id === currentPhaseId);
    const taskData = {
      name: taskFormData.name,
      gantt_phase_id: currentPhaseId,
      sort_order: tasksInPhase.length + 1,
    };

    if (taskFormData.time_type) {
      taskData.time_type = taskFormData.time_type;
      taskData.start_date = taskFormData.start_date || null;
      taskData.end_date = taskFormData.time_type === 'duration' ? (taskFormData.end_date || null) : null;
    }

    createGanttTask.mutate(taskData);
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
              onClick={(e) => {
                e.stopPropagation();
                setCreatingProjectId(row.data.id);
                setSelectedSamples({}); // Clear previous sample selections
                setShowAddPhaseDialog(true);
              }}
              className="p-1 hover:bg-gray-600 rounded"
              title="新增樣品"
            >
              <Plus className="w-3 h-3" />
            </button>
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
            <span
              className="text-xs text-blue-500 font-normal flex-shrink-0 cursor-pointer hover:underline"
              onClick={(e) => { e.stopPropagation(); handleJumpToTasks(row.data.id); }}
              title="點擊跳轉到任務位置"
            >
              {phaseTasks.length}個任務
            </span>
          )}
          <div className="hidden group-hover:flex gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPhaseId(row.data.id);
                setTaskFormData({ name: '', is_important: false, note: '', time_type: '', start_date: '', end_date: '' });
                setShowAddTaskDialog(true);
              }}
              className="p-1 hover:bg-gray-300 rounded"
              title="新增任務"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingPhase(row.data);
                setEditingPhaseName(row.data.name);
                setEditingPhaseTasks(ganttTasks.filter(t => t.gantt_phase_id === row.data.id));
                setNewTaskName('');
                setShowEditPhaseDialog(true);
              }}
              className="p-1 hover:bg-gray-300 rounded"
              title="編輯樣品"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`確定刪除「${row.data.name}」及其所有任務？`)) {
                  deleteGanttPhase.mutate(row.data.id);
                }
              }}
              className="p-1 hover:bg-red-200 rounded text-red-500"
              title="刪除樣品"
            >
              <Trash2 className="w-3 h-3" />
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

    const dayOfWeek = getDay(day);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidays?.some(h => h.date === dateStr);
    const isDimmed = isWeekend || isHoliday;

    // 專案列
    if (row.type === 'project') {
      return (
        <div
          key={dateStr}
          className="border-r border-gray-200"
          style={{ 
            width: CELL_WIDTH, 
            height: ROW_HEIGHT, 
            backgroundColor: isDimmed ? '#d1d5db' : '#e5e7eb',
            borderBottom: '1px solid #d1d5db'
          }}
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
              className="relative cursor-pointer"
              style={{
                width: CELL_WIDTH, 
                height: ROW_HEIGHT,
                borderRight: '1px solid #d1d5db',
                borderBottom: '1px solid #d1d5db',
                backgroundColor: isInDragRangePhase ? '#bfdbfe'
                  : isDimmed ? '#d1d5db'
                  : selectedPhaseTask ? '#eff6ff'
                  : '#f9fafb'
              }}
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
                // 退出畫日期模式
                setDrawingMode(false);
                setPendingTask(null);
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

      {/* Navigation */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="font-semibold text-lg">{format(visibleMonth, 'yyyy年MM月')}</span>
        <Button variant="outline" size="sm" onClick={scrollToToday}>今天</Button>


        {/* 部門切換（單選） */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden">
          <button
            onClick={() => setSelectedDeptId(null)}
            className={`px-3 py-1.5 text-xs font-medium border-r border-gray-200 transition-colors ${
              !selectedDeptId ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >全部</button>
          {departments.map(dept => (
            <button key={dept.id}
              onClick={() => setSelectedDeptId(selectedDeptId === dept.id ? null : dept.id)}
              className={`px-3 py-1.5 text-xs font-medium border-r border-gray-200 last:border-0 transition-colors ${
                selectedDeptId === dept.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >{dept.short_name || dept.name}</button>
          ))}
        </div>

        {/* 品牌篩選（多選） */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              selectedBrandIds.length > 0
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
              品牌
              {selectedBrandIds.length > 0 && (
                <span className="bg-white text-violet-700 rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                  {selectedBrandIds.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-semibold text-gray-600">選擇品牌</span>
              {selectedBrandIds.length > 0 && (
                <button onClick={() => setSelectedBrandIds([])}
                  className="text-xs text-gray-400 hover:text-gray-600 underline">清除</button>
              )}
            </div>
            <div className="space-y-1">
              {projects.map(p => (
                <label key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                  selectedBrandIds.includes(p.id) ? 'bg-violet-50' : 'hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedBrandIds.includes(p.id)}
                    onChange={(e) => setSelectedBrandIds(prev =>
                      e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                    )}
                    className="w-3.5 h-3.5 accent-violet-600"
                  />
                  <span className="text-sm">{p.short_name || p.name}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 畫日期模式提示 */}
      {drawingMode && pendingTask && (
        <Card className="p-3 bg-green-50 border-green-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600 font-semibold animate-pulse">●</span>
              <span className="font-medium">畫日期模式：</span>
              <span className="text-green-700 font-semibold">{pendingTask.name}</span>
              <span className="text-gray-500 text-xs">— 在右側拖曳選擇日期區間</span>
            </div>
            <button 
              onClick={() => { setDrawingMode(false); setPendingTask(null); clearSelection(); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              跳過
            </button>
          </div>
        </Card>
      )}

      {/* Toolbar */}
      {selectedTaskId && !drawingMode && (
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
              {viewMode === 'month' && (
                <div
                  className="bg-gray-100 border-b border-gray-200"
                  style={{ height: 20 }}
                />
              )}
              <div
                className="bg-gray-100 border-b border-gray-300 px-3 font-semibold text-sm flex items-center"
                style={{ height: viewMode === 'month' ? ROW_HEIGHT + 14 : ROW_HEIGHT }}
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
                    {visibleRows.map((row, idx) => {
                     const droppableIdForPhase = row.type === 'phase' ? `droppable-phase-${row.data.gantt_project_id}` : undefined;
                     const draggableType = row.type.toUpperCase();

                      return (
                        <Draggable key={row.id} draggableId={row.id} index={idx} type={draggableType}>
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
                    {visibleRows.length === 0 && (
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
          <div className="flex-1 overflow-x-auto" ref={(el) => { rightPanelRef.current = el; rightPanelContainerRef.current = el; }} onScroll={handleRightScroll}>
              {viewMode === 'month' && (
                <div className="flex bg-gray-50 border-b border-gray-200" style={{ minWidth: days.length * CELL_WIDTH }}>
                  {(() => {
                     const groups = [];
                     let current = null;
                     days.forEach((day) => {
                       const monthKey = format(day, 'yyyy-MM');
                       if (current?.key !== monthKey) {
                         current = { key: monthKey, label: format(day, 'yyyy年M月'), count: 1 };
                         groups.push(current);
                       } else {
                         current.count++;
                       }
                     });
                     return groups.map(g => (
                       <div
                         key={g.key}
                         className="border-r border-gray-300 text-xs font-semibold text-gray-600 flex items-center justify-center bg-gray-100"
                         style={{ width: g.count * CELL_WIDTH, flexShrink: 0, height: 20 }}
                       >
                         {g.label}
                       </div>
                     ));
                   })()}
                 </div>
              )}
            {/* 日期 header */}
            <div className="flex bg-gray-100 border-b border-gray-300" style={{ height: viewMode === 'month' ? ROW_HEIGHT + 14 : ROW_HEIGHT }}>
              {days.map((day) => {
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                const isHolidayHeader = holidays?.some(h => h.date === format(day, 'yyyy-MM-dd'));
                const isDimmedHeader = isWeekend || isHolidayHeader;
                return (
                  <div
                    key={day.toISOString()}
                    className={`flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center gap-0.5 ${
                      isToday(day) ? 'bg-red-100 text-red-700' :
                      isDimmedHeader ? 'bg-gray-300 text-gray-500' :
                      'bg-gray-100 text-gray-700'
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
                const isWeekendLeave = getDay(day) === 0 || getDay(day) === 6;
                const isHolidayLeave = holidays?.some(h => h.date === dateStr);
                const isDimmedLeave = isWeekendLeave || isHolidayLeave;
                const count = leaveCountByDate[dateStr] || 0;
                const leaveStyle = getLeaveCountStyle(count);
                const cell = (
                  <div
                    key={day.toISOString()}
                    className="flex-shrink-0 border-r border-gray-200 flex items-center justify-center"
                    style={{
                      width: CELL_WIDTH,
                      height: 28,
                      backgroundColor: leaveStyle?.bg || (isDimmedLeave ? '#d1d5db' : 'transparent'),
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
                // 按部門分組
                const leaveEntries = leaveNamesByDate[dateStr] || [];
                const deptMap = {};
                leaveEntries.forEach(({ employeeId }) => {
                  const emp = employees.find(e => e.id === employeeId);
                  if (!emp) return;
                  (emp.department_ids || []).forEach(deptId => {
                    const dept = departments.find(d => d.id === deptId);
                    if (!dept) return;
                    if (!deptMap[dept.name]) deptMap[dept.name] = [];
                    if (!deptMap[dept.name].includes(emp.name)) deptMap[dept.name].push(emp.name);
                  });
                });
                return (
                  <Popover key={day.toISOString()}>
                    <PopoverTrigger asChild>{cell}</PopoverTrigger>
                    <PopoverContent className="min-w-[140px] p-2 text-xs" side="bottom" align="center">
                      {Object.entries(deptMap).map(([deptName, names]) => (
                        <div key={deptName} className="mb-2 last:mb-0">
                          <p className="font-semibold text-gray-500 mb-1">{deptName}</p>
                          {names.map(name => (
                            <p key={name} className="text-gray-800 pl-2">{name}</p>
                          ))}
                        </div>
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
              onMouseLeave={() => {
                if (isDragging) {
                  setIsDragging(false);
                  setDragTaskId(null);
                }
              }}
            >
              {visibleRows.map((row) => (
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

      <MilestoneDialog
        open={showMilestoneDialog}
        onOpenChange={setShowMilestoneDialog}
        taskName={getSelectedTaskName()}
        firstDate={firstDate}
        onConfirm={handleConfirmMilestone}
        onClearTime={() => {
          updateTaskWithOptimistic(selectedTaskId, { time_type: null, start_date: null, end_date: null });
          setShowMilestoneDialog(false);
        }}
      />

      <DurationDialog
        open={showDurationDialog}
        onOpenChange={setShowDurationDialog}
        taskName={getSelectedTaskName()}
        firstDate={firstDate}
        secondDate={secondDate}
        getSortedDates={getSortedDates}
        onConfirm={handleConfirmDuration}
        onClearTime={() => {
          updateTaskWithOptimistic(selectedTaskId, { time_type: null, start_date: null, end_date: null });
          setShowDurationDialog(false);
        }}
      />

      <RollingDialog
        open={showRollingDialog}
        onOpenChange={setShowRollingDialog}
        taskName={getSelectedTaskName()}
        firstDate={firstDate}
        onConfirm={handleConfirmRolling}
        onClearTime={() => {
          updateTaskWithOptimistic(selectedTaskId, { time_type: null, start_date: null, end_date: null });
          setShowRollingDialog(false);
        }}
      />

      <AddProjectDialog
        open={showAddProjectDialog}
        onOpenChange={setShowAddProjectDialog}
        projectFormData={projectFormData}
        setProjectFormData={setProjectFormData}
        projectCreationMode={projectCreationMode}
        setProjectCreationMode={setProjectCreationMode}
        selectedSamples={selectedSamples}
        setSelectedSamples={setSelectedSamples}
        projects={projects}
        samples={samples}
        getBrandName={getBrandName}
        getSamplesByBrand={getSamplesByBrand}
        onConfirm={handleAddProject}
        isLoading={createGanttProject.isPending || bulkCreatePhases.isPending}
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
        onSave={() => {
          if (editingProject) {
            updateGanttProject.mutate({ id: editingProject.id, data: { name: editingProject.name } });
          }
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
        onOpenChange={setShowAddTaskDialog}
        taskFormData={taskFormData}
        setTaskFormData={setTaskFormData}
        onConfirm={handleAddTask}
      />

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
      );
      }