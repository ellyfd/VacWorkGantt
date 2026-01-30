import React, { useState, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, ChevronDown, ChevronRight, Diamond, ArrowRight, Repeat, GripVertical, Upload } from 'lucide-react';
import { addMonths, format, eachDayOfInterval, isToday } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const ROW_HEIGHT = 40;

export default function GanttChart() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // 選擇狀態
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [firstDate, setFirstDate] = useState(null);
  const [secondDate, setSecondDate] = useState(null);
  
  // 展開狀態
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedPhases, setExpandedPhases] = useState({});
  
  // Dialog 狀態
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [showSelectSamplesDialog, setShowSelectSamplesDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [showRollingDialog, setShowRollingDialog] = useState(false);
  const [showImportScheduleDialog, setShowImportScheduleDialog] = useState(false);

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

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('sort_order'),
  });

  const { data: samples = [] } = useQuery({
    queryKey: ['samples'],
    queryFn: () => base44.entities.Sample.list('sort_order'),
  });

  // Mutations
  const createGanttProject = useMutation({
    mutationFn: (data) => base44.entities.GanttProject.create(data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries(['ganttProjects']);
      setCreatingProjectId(newProject.id);
      setShowAddProjectDialog(false);
      if (projectCreationMode === 'manual') {
        setShowSelectSamplesDialog(true);
      } else {
        setShowImportScheduleDialog(true);
      }
    },
  });

  const bulkCreatePhases = useMutation({
    mutationFn: async (phases) => {
      for (const phase of phases) {
        await base44.entities.GanttPhase.create(phase);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttPhases']);
      setShowSelectSamplesDialog(false);
      setSelectedSamples({});
      setProjectFormData({ brand_id: '', season: '' });
      setTaskCreationMode('manual');
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

  const updateGanttTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GanttTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttTasks']);
      clearSelection();
    },
  });

  // 清除選擇
  const clearSelection = () => {
    setSelectedTaskId(null);
    setFirstDate(null);
    setSecondDate(null);
  };

  // Get month days
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 建立統一的 rows 陣列
  const rows = useMemo(() => {
    const result = [];

    ganttProjects.forEach((project) => {
      result.push({ type: 'project', data: project, id: `project-${project.id}` });

      if (expandedProjects[project.id]) {
        ganttPhases
          .filter((p) => p.gantt_project_id === project.id)
          .forEach((phase) => {
            result.push({ type: 'phase', data: phase, id: `phase-${phase.id}` });

            if (expandedPhases[phase.id]) {
              ganttTasks
                .filter((t) => t.gantt_phase_id === phase.id)
                .forEach((task) => {
                  result.push({ type: 'task', data: task, id: `task-${task.id}` });
                });
            }
          });
      }
    });

    return result;
  }, [ganttProjects, ganttPhases, ganttTasks, expandedProjects, expandedPhases]);

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
  const handleAddProject = () => {
    if (!projectFormData.brand_id || !projectFormData.season) return;

    const brand = projects.find((p) => p.id === projectFormData.brand_id);
    const name = `${brand.short_name || brand.name} ${projectFormData.season}`;

    createGanttProject.mutate({
      ...projectFormData,
      name,
    });
  };

  const handleSelectSamples = () => {
    if (!creatingProjectId) return;
    const selectedSampleIds = Object.keys(selectedSamples).filter((k) => selectedSamples[k]);

    const phasesToCreate = selectedSampleIds.map((sampleId, idx) => {
      const sample = samples.find((s) => s.id === sampleId);
      return {
        gantt_project_id: creatingProjectId,
        sample_id: sampleId,
        name: sample.short_name || sample.name,
        sort_order: idx + 1,
      };
    });

    bulkCreatePhases.mutate(phasesToCreate);
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

  // 確認設定里程碑
  const handleConfirmMilestone = () => {
    if (!firstDate || !selectedTaskId) return;
    updateGanttTask.mutate({
      id: selectedTaskId,
      data: {
        time_type: 'milestone',
        start_date: format(firstDate, 'yyyy-MM-dd'),
        end_date: null,
      },
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
    
    updateGanttTask.mutate({
      id: selectedTaskId,
      data: {
        time_type: 'duration',
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      },
    });
    setShowDurationDialog(false);
  };

  // 確認設定 Rolling
  const handleConfirmRolling = () => {
    if (!firstDate || !selectedTaskId) return;
    updateGanttTask.mutate({
      id: selectedTaskId,
      data: {
        time_type: 'rolling',
        start_date: format(firstDate, 'yyyy-MM-dd'),
        end_date: null,
      },
    });
    setShowRollingDialog(false);
  };

  const toggleProject = (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const togglePhase = (phaseId) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  // 拖曳排序
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
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttProjects']);
      queryClient.invalidateQueries(['ganttPhases']);
      queryClient.invalidateQueries(['ganttTasks']);
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
          className={`flex items-center gap-2 px-3 bg-gray-800 text-white ${isDragging ? 'bg-blue-700' : 'hover:bg-gray-900'} cursor-pointer font-bold text-sm`}
          style={{ height: ROW_HEIGHT }}
          onClick={() => toggleProject(row.data.id)}
        >
          <GripVertical className="w-4 h-4 flex-shrink-0 opacity-60" />
          {expandedProjects[row.data.id] ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="truncate">{row.data.name}</span>
        </div>
      );
    }

    if (row.type === 'phase') {
      return (
        <div
          className={`flex items-center gap-2 px-3 pl-8 bg-gray-100 ${isDragging ? 'bg-blue-100' : 'hover:bg-gray-200'} cursor-pointer font-medium text-sm text-gray-800`}
          style={{ height: ROW_HEIGHT }}
          onClick={() => togglePhase(row.data.id)}
        >
          <GripVertical className="w-4 h-4 flex-shrink-0 text-gray-400" />
          {expandedPhases[row.data.id] ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="truncate flex-1">{row.data.name}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentPhaseId(row.data.id);
              setShowAddTaskDialog(true);
            }}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      );
    }

    if (row.type === 'task') {
      return (
        <div
          className={`flex items-center px-3 pl-12 text-sm cursor-pointer ${
            selectedTaskId === row.data.id ? 'bg-blue-100 font-medium' : isDragging ? 'bg-blue-100' : 'bg-white hover:bg-blue-50'
          }`}
          style={{ height: ROW_HEIGHT }}
          onClick={() => handleTaskClick(row.data.id)}
        >
          <GripVertical className="w-3 h-3 mr-2 flex-shrink-0 text-gray-400" />
          <span className="truncate text-gray-700">{row.data.name}</span>
        </div>
      );
    }
  };

  // 渲染右側單元格
  const renderRightCell = (row, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    
    const isFirstSelected = selectedTaskId === row.data?.id && firstDate && format(firstDate, 'yyyy-MM-dd') === dateStr;
    const isSecondSelected = selectedTaskId === row.data?.id && secondDate && format(secondDate, 'yyyy-MM-dd') === dateStr;
    const isSelected = isFirstSelected || isSecondSelected;

    // 專案列
    if (row.type === 'project') {
      return (
        <div
          key={dateStr}
          className="border-r border-gray-200 bg-gray-200"
          style={{ width: 40, height: ROW_HEIGHT }}
        />
      );
    }

    // 階段列
    if (row.type === 'phase') {
      return (
        <div
          key={dateStr}
          className="border-r border-gray-200 bg-gray-100"
          style={{ width: 40, height: ROW_HEIGHT }}
        />
      );
    }

    // 任務列
    const task = row.data;
    const taskStartDate = task.start_date;
    const taskEndDate = task.end_date;
    const isStart = taskStartDate === dateStr;
    const isEnd = taskEndDate === dateStr;
    const isInRange =
      task.time_type === 'duration' &&
      taskStartDate &&
      taskEndDate &&
      dateStr >= taskStartDate &&
      dateStr <= taskEndDate;
    const isRolling =
      task.time_type === 'rolling' && taskStartDate && dateStr >= taskStartDate;

    return (
      <div
        key={dateStr}
        className={`border-r border-gray-200 relative cursor-pointer transition-colors ${
          selectedTaskId === task.id ? 'bg-blue-50' : 'bg-white'
        } ${isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-100' : ''} hover:bg-yellow-50`}
        style={{ width: 40, height: ROW_HEIGHT }}
        onClick={() => {
          if (task.start_date && (isStart || isInRange || isRolling)) {
            // 點擊已有甘特條，打開編輯 Dialog
            setSelectedTaskId(task.id);
            setShowMilestoneDialog(task.time_type === 'milestone');
            setShowDurationDialog(task.time_type === 'duration');
            setShowRollingDialog(task.time_type === 'rolling');
          } else {
            // 點擊空白格子，選擇日期
            handleDateClick(day, task.id);
          }
        }}
      >
        {/* 里程碑 ◆ */}
        {task.time_type === 'milestone' && isStart && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-4 h-4 transform rotate-45 ${
                task.is_important ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
            />
          </div>
        )}

        {/* 區間 ████ */}
        {task.time_type === 'duration' && isInRange && (
          <div
            className={`absolute top-1/2 h-3 bg-blue-400 transform -translate-y-1/2 ${
              isStart && isEnd ? 'left-2 right-2 rounded' :
              isStart ? 'left-2 right-0 rounded-l' : 
              isEnd ? 'left-0 right-2 rounded-r' : 
              'left-0 right-0'
            }`}
          />
        )}

        {/* Rolling ▓▓▓→ */}
        {task.time_type === 'rolling' && isRolling && (
          <div
            className={`absolute top-1/2 h-3 transform -translate-y-1/2 ${
              isStart 
                ? 'left-2 right-0 bg-gradient-to-r from-purple-500 to-purple-300 rounded-l' 
                : 'left-0 right-0 bg-purple-300'
            }`}
          />
        )}

        {/* 今天標記 */}
        {isToday(day) && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 z-10" />
        )}
        
        {/* 選中標記數字 */}
        {isFirstSelected && !isSecondSelected && (
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-bl font-bold">
            1
          </div>
        )}
        {isSecondSelected && (
          <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-bl font-bold">
            2
          </div>
        )}
      </div>
    );
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
      <div className="flex gap-4 items-center">
        <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
          上月
        </Button>
        <span className="font-semibold text-lg">{format(currentMonth, 'yyyy年MM月')}</span>
        <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          下月
        </Button>
      </div>

      {/* Toolbar */}
      {selectedTaskId && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">選中任務：</span>
              <span className="text-blue-700 font-semibold">{getSelectedTaskName()}</span>
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
              <Droppable droppableId="droppable-project" type="PROJECT">
                {(provided, snapshot) => (
                  <div
                    className="overflow-y-auto"
                    style={{ maxHeight: 'calc(100vh - 400px)' }}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {rows.filter(r => r.type === 'project').map((row, idx) => (
                      <Draggable key={row.id} draggableId={row.id} index={idx} type="PROJECT">
                        {(provided, snapshot) => (
                          <div
                            key={row.id}
                            className="border-b border-gray-200"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {renderLeftCell(row, snapshot.isDragging)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {rows.filter(r => r.type === 'project').map((projectRow) => {
                      const projectPhases = rows.filter(
                        r => r.type === 'phase' && r.data.gantt_project_id === projectRow.data.id
                      );
                      return expandedProjects[projectRow.data.id] ? (
                        <Droppable
                          key={`phase-droppable-${projectRow.data.id}`}
                          droppableId={`droppable-phase-${projectRow.data.id}`}
                          type="PHASE"
                        >
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                              {projectPhases.map((phaseRow, idx) => (
                                <Draggable
                                  key={phaseRow.id}
                                  draggableId={phaseRow.id}
                                  index={idx}
                                  type="PHASE"
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      className="border-b border-gray-200"
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                    >
                                      {renderLeftCell(phaseRow, snapshot.isDragging)}
                                      {expandedPhases[phaseRow.data.id] && (
                                        <Droppable
                                          droppableId={`droppable-task-${phaseRow.data.id}`}
                                          type="TASK"
                                        >
                                          {(provided) => (
                                            <div ref={provided.innerRef} {...provided.droppableProps}>
                                              {rows
                                                .filter(
                                                  r =>
                                                    r.type === 'task' &&
                                                    r.data.gantt_phase_id === phaseRow.data.id
                                                )
                                                .map((taskRow, idx) => (
                                                  <Draggable
                                                    key={taskRow.id}
                                                    draggableId={taskRow.id}
                                                    index={idx}
                                                    type="TASK"
                                                  >
                                                    {(provided, snapshot) => (
                                                      <div
                                                        className="border-b border-gray-200"
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                      >
                                                        {renderLeftCell(taskRow, snapshot.isDragging)}
                                                      </div>
                                                    )}
                                                  </Draggable>
                                                ))}
                                              {provided.placeholder}
                                            </div>
                                          )}
                                        </Droppable>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      ) : null;
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
          <div className="flex-1 overflow-x-auto">
            <div
              className="flex bg-gray-100 border-b border-gray-300"
              style={{ height: ROW_HEIGHT }}
            >
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`flex-shrink-0 border-r border-gray-200 flex items-center justify-center text-xs font-medium ${
                    isToday(day) ? 'bg-red-100 text-red-700' : ''
                  }`}
                  style={{ width: 40 }}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
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
                updateGanttTask.mutate({
                  id: selectedTaskId,
                  data: { time_type: null, start_date: null, end_date: null },
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
                updateGanttTask.mutate({
                  id: selectedTaskId,
                  data: { time_type: null, start_date: null, end_date: null },
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
                updateGanttTask.mutate({
                  id: selectedTaskId,
                  data: { time_type: null, start_date: null, end_date: null },
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

      {/* Add Project Dialog */}
      <Dialog open={showAddProjectDialog} onOpenChange={setShowAddProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增開發季</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>品牌 *</Label>
              <Select
                value={projectFormData.brand_id}
                onValueChange={(v) => setProjectFormData({ ...projectFormData, brand_id: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇品牌..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.short_name || p.name}
                    </SelectItem>
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
                  <SelectItem value="SS25">SS25</SelectItem>
                  <SelectItem value="FW25">FW25</SelectItem>
                  <SelectItem value="HO25">HO25</SelectItem>
                  <SelectItem value="SS26">SS26</SelectItem>
                  <SelectItem value="FW26">FW26</SelectItem>
                  <SelectItem value="HO26">HO26</SelectItem>
                  <SelectItem value="SS27">SS27</SelectItem>
                  <SelectItem value="FW27">FW27</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {projectFormData.brand_id && projectFormData.season && (
            <>
            <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
              專案名稱：<strong>{getBrandName(projectFormData.brand_id)} {projectFormData.season}</strong>
            </div>
            <div className="pt-4 border-t">
              <Label className="mb-2 block">建立方式</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={projectCreationMode === 'manual' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setProjectCreationMode('manual')}
                >
                  📝 手動選擇樣品
                </Button>
                <Button
                  type="button"
                  variant={projectCreationMode === 'import' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setProjectCreationMode('import')}
                >
                  📎 上傳時程表
                </Button>
              </div>
            </div>
            </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddProjectDialog(false);
                setProjectFormData({ brand_id: '', season: '' });
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleAddProject}
              disabled={!projectFormData.brand_id || !projectFormData.season}
              className="bg-blue-600 hover:bg-blue-700"
            >
              下一步
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
              setShowSelectSamplesDialog(true);
              setScheduleFile(null);
            }}>
              改用手動
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

      {/* Select Samples Dialog */}
      <Dialog open={showSelectSamplesDialog} onOpenChange={setShowSelectSamplesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>選擇樣品類別</DialogTitle>
            <DialogDescription>
              選擇要建立的階段（樣品類別）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              品牌：<strong>{getBrandName(projectFormData.brand_id)}</strong>
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {getSamplesByBrand(projectFormData.brand_id).map((sample) => (
                <label
                  key={sample.id}
                  className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                    selectedSamples[sample.id] 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSamples[sample.id] || false}
                    onChange={(e) =>
                      setSelectedSamples((prev) => ({
                        ...prev,
                        [sample.id]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{sample.short_name || sample.name}</span>
                </label>
              ))}
            </div>
            {getSamplesByBrand(projectFormData.brand_id).length === 0 && (
              <p className="text-center text-gray-400 py-4">
                此品牌沒有樣品類別，請先到「專案設定」新增
              </p>
            )}
            <div className="text-sm text-gray-500">
              已選擇 {Object.values(selectedSamples).filter(Boolean).length} 個
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSelectSamplesDialog(false);
                setSelectedSamples({});
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSelectSamples}
              disabled={!Object.values(selectedSamples).some(Boolean)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              建立
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
    </div>
  );
}