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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { addMonths, format, eachDayOfInterval, isToday } from 'date-fns';

const ROW_HEIGHT = 40; // 統一行高

export default function GanttChart() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedPhases, setExpandedPhases] = useState({});
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [showSelectSamplesDialog, setShowSelectSamplesDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [currentPhaseId, setCurrentPhaseId] = useState(null);
  const [creatingProjectId, setCreatingProjectId] = useState(null);

  const [projectFormData, setProjectFormData] = useState({ brand_id: '', season: '' });
  const [taskFormData, setTaskFormData] = useState({ name: '', is_important: false, note: '' });
  const [selectedSamples, setSelectedSamples] = useState({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

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
      setShowSelectSamplesDialog(true);
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
      setCreatingProjectId(null);
      setProjectFormData({ brand_id: '', season: '' });
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
      setSelectedDate(null);
      setSelectedTaskId(null);
    },
  });

  // Get month days
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 建立統一的 rows 陣列（關鍵修正）
  const rows = useMemo(() => {
    const result = [];

    ganttProjects.forEach((project) => {
      // 專案列
      result.push({ type: 'project', data: project, id: `project-${project.id}` });

      if (expandedProjects[project.id]) {
        ganttPhases
          .filter((p) => p.gantt_project_id === project.id)
          .forEach((phase) => {
            // 階段列
            result.push({ type: 'phase', data: phase, id: `phase-${phase.id}` });

            if (expandedPhases[phase.id]) {
              ganttTasks
                .filter((t) => t.gantt_phase_id === phase.id)
                .forEach((task) => {
                  // 任務列
                  result.push({ type: 'task', data: task, id: `task-${task.id}` });
                });
            }
          });
      }
    });

    return result;
  }, [ganttProjects, ganttPhases, ganttTasks, expandedProjects, expandedPhases]);

  const getBrandName = (brandId) => {
    const project = projects.find((p) => p.id === brandId);
    return project ? project.short_name : '-';
  };

  const getSamplesByBrand = (brandId) => {
    return samples.filter((s) => s.project_id === brandId);
  };

  const handleAddProject = () => {
    if (!projectFormData.brand_id || !projectFormData.season) return;

    const brand = projects.find((p) => p.id === projectFormData.brand_id);
    const name = `${brand.short_name} ${projectFormData.season}`;

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
        name: sample.short_name,
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

  const handleTaskClick = (taskId) => {
    setSelectedTaskId(taskId);
    setSelectedDate(null);
  };

  const handleDateClick = (date, taskId) => {
    setSelectedTaskId(taskId);
    setSelectedDate(date);
  };

  const handleSetMilestone = () => {
    if (!selectedDate || !selectedTaskId) return;
    updateGanttTask.mutate({
      id: selectedTaskId,
      data: {
        time_type: 'milestone',
        start_date: format(selectedDate, 'yyyy-MM-dd'),
        end_date: null,
      },
    });
  };

  const handleSetDuration = () => {
    if (!selectedDate || !selectedTaskId) return;
    updateGanttTask.mutate({
      id: selectedTaskId,
      data: {
        time_type: 'duration',
        start_date: format(selectedDate, 'yyyy-MM-dd'),
        end_date: format(selectedDate, 'yyyy-MM-dd'),
      },
    });
  };

  const handleSetRolling = () => {
    if (!selectedDate || !selectedTaskId) return;
    updateGanttTask.mutate({
      id: selectedTaskId,
      data: {
        time_type: 'rolling',
        start_date: format(selectedDate, 'yyyy-MM-dd'),
        end_date: null,
      },
    });
  };

  const handleClearTime = () => {
    if (!selectedTaskId) return;
    updateGanttTask.mutate({
      id: selectedTaskId,
      data: {
        time_type: null,
        start_date: null,
        end_date: null,
      },
    });
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

  // 渲染左側單元格
  const renderLeftCell = (row) => {
    if (row.type === 'project') {
      return (
        <div
          className="flex items-center gap-2 px-3 bg-gray-200 hover:bg-gray-300 cursor-pointer font-semibold text-sm"
          style={{ height: ROW_HEIGHT }}
          onClick={() => toggleProject(row.data.id)}
        >
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
          className="flex items-center gap-2 px-3 pl-6 bg-gray-100 hover:bg-gray-200 cursor-pointer font-medium text-sm"
          style={{ height: ROW_HEIGHT }}
          onClick={() => togglePhase(row.data.id)}
        >
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
          className={`flex items-center px-3 pl-10 text-sm cursor-pointer ${
            selectedTaskId === row.data.id ? 'bg-blue-100' : 'bg-white hover:bg-blue-50'
          }`}
          style={{ height: ROW_HEIGHT }}
          onClick={() => handleTaskClick(row.data.id)}
        >
          <span className="truncate">{row.data.name}</span>
        </div>
      );
    }
  };

  // 渲染右側單元格（時間軸）
  const renderRightCell = (row, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isSelected =
      selectedTaskId === row.data?.id &&
      selectedDate &&
      format(selectedDate, 'yyyy-MM-dd') === dateStr;

    // 專案和階段列不顯示甘特條，只顯示空格子
    if (row.type === 'project') {
      return (
        <div
          key={dateStr}
          className="border-r border-gray-200 bg-gray-200"
          style={{ width: 40, height: ROW_HEIGHT }}
        />
      );
    }

    if (row.type === 'phase') {
      return (
        <div
          key={dateStr}
          className="border-r border-gray-200 bg-gray-100"
          style={{ width: 40, height: ROW_HEIGHT }}
        />
      );
    }

    // 任務列顯示甘特條
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
        className={`border-r border-gray-200 relative cursor-pointer ${
          selectedTaskId === task.id ? 'bg-blue-50' : 'bg-white'
        } ${isSelected ? 'ring-2 ring-inset ring-blue-400' : ''} hover:bg-yellow-50`}
        style={{ width: 40, height: ROW_HEIGHT }}
        onClick={() => handleDateClick(day, task.id)}
        onDoubleClick={() => {
          setSelectedTaskId(task.id);
          handleClearTime();
        }}
      >
        {/* 里程碑 */}
        {task.time_type === 'milestone' && isStart && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-3 h-3 transform rotate-45 ${
                task.is_important ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
            />
          </div>
        )}

        {/* 區間 */}
        {task.time_type === 'duration' && isInRange && (
          <div
            className={`absolute top-1/2 h-2 bg-blue-400 transform -translate-y-1/2 ${
              isStart ? 'left-1/2 right-0 rounded-l' : isEnd ? 'left-0 right-1/2 rounded-r' : 'left-0 right-0'
            }`}
          />
        )}

        {/* Rolling */}
        {task.time_type === 'rolling' && isRolling && (
          <div
            className={`absolute top-1/2 h-2 transform -translate-y-1/2 ${
              isStart ? 'left-1/2 right-0 bg-gradient-to-r from-blue-400 to-blue-200' : 'left-0 right-0 bg-blue-200'
            }`}
          />
        )}

        {/* 今天標記 */}
        {isToday(day) && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500" />
        )}
      </div>
    );
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
          新增專案
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
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="text-sm text-gray-700">
              已選任務 | 已選日期：{selectedDate ? format(selectedDate, 'MM/dd') : '未選'}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleSetMilestone} disabled={!selectedDate}>
                里程碑
              </Button>
              <Button size="sm" variant="outline" onClick={handleSetDuration} disabled={!selectedDate}>
                區間
              </Button>
              <Button size="sm" variant="outline" onClick={handleSetRolling} disabled={!selectedDate}>
                Rolling
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedTaskId(null);
                  setSelectedDate(null);
                }}
              >
                取消
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Gantt Chart */}
      <Card className="overflow-hidden">
        <div className="flex">
          {/* Left Panel - Names */}
          <div className="w-64 flex-shrink-0 border-r border-gray-300">
            {/* Header */}
            <div
              className="bg-gray-100 border-b border-gray-300 px-3 font-semibold text-sm flex items-center"
              style={{ height: ROW_HEIGHT }}
            >
              專案名稱
            </div>
            {/* Rows */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
              {rows.map((row) => (
                <div key={row.id} className="border-b border-gray-200">
                  {renderLeftCell(row)}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Timeline */}
          <div className="flex-1 overflow-x-auto">
            {/* Header - Days */}
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
            {/* Rows */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
              {rows.map((row) => (
                <div key={row.id} className="flex border-b border-gray-200">
                  {days.map((day) => renderRightCell(row, day))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Add Project Dialog */}
      <Dialog open={showAddProjectDialog} onOpenChange={setShowAddProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增專案</DialogTitle>
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
                </SelectContent>
              </Select>
            </div>
            {projectFormData.brand_id && projectFormData.season && (
              <div className="text-sm text-gray-600">
                專案名稱：{getBrandName(projectFormData.brand_id)} {projectFormData.season}
              </div>
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

      {/* Select Samples Dialog */}
      <Dialog open={showSelectSamplesDialog} onOpenChange={setShowSelectSamplesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>選擇樣品類別</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              品牌：{getBrandName(projectFormData.brand_id)}
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {getSamplesByBrand(projectFormData.brand_id).map((sample) => (
                <label
                  key={sample.id}
                  className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
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
              建立專案
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
              <span className="text-sm">標記為重要（黃色）</span>
            </label>
            <div>
              <Label>備註</Label>
              <Input
                value={taskFormData.note}
                onChange={(e) => setTaskFormData({ ...taskFormData, note: e.target.value })}
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