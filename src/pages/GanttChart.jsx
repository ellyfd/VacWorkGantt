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
import { Loader2, Plus, ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { addMonths, format, eachDayOfInterval, isToday } from 'date-fns';

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

  const createGanttPhase = useMutation({
    mutationFn: (data) => base44.entities.GanttPhase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ganttPhases']);
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

  // Get month range
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get weeks for column headers
  const weeks = useMemo(() => {
    const w = [];
    let currentWeek = [];
    days.forEach((day, idx) => {
      currentWeek.push(day);
      if ((idx + 1) % 7 === 0) {
        w.push([...currentWeek]);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) w.push(currentWeek);
    return w;
  }, [days]);

  const getBrandName = (brandId) => {
    const project = projects.find(p => p.id === brandId);
    return project ? project.short_name : '-';
  };

  const getSampleName = (sampleId) => {
    const sample = samples.find(s => s.id === sampleId);
    return sample ? sample.short_name : '-';
  };

  const getSamplesByBrand = (brandId) => {
    return samples.filter(s => s.project_id === brandId);
  };

  const handleAddProject = () => {
    if (!projectFormData.brand_id || !projectFormData.season) return;

    const brand = projects.find(p => p.id === projectFormData.brand_id);
    const name = `${brand.short_name} ${projectFormData.season}`;

    createGanttProject.mutate({
      ...projectFormData,
      name,
    });
  };

  const handleSelectSamples = () => {
    if (!creatingProjectId) return;
    const selectedSampleIds = Object.keys(selectedSamples).filter(k => selectedSamples[k]);

    const phasesToCreate = selectedSampleIds.map((sampleId) => {
      const sample = samples.find(s => s.id === sampleId);
      return {
        gantt_project_id: creatingProjectId,
        sample_id: sampleId,
        name: sample.short_name,
      };
    });

    bulkCreatePhases.mutate(phasesToCreate);
  };

  const handleAddTask = () => {
    if (!taskFormData.name || !currentPhaseId) return;

    createGanttTask.mutate({
      ...taskFormData,
      gantt_phase_id: currentPhaseId,
    });
  };

  const handleTaskClick = (taskId) => {
    setSelectedTaskId(taskId);
  };

  const handleDateClick = (date) => {
    if (!selectedTaskId) return;
    setSelectedDate(date);
  };

  const handleSetMilestone = () => {
    const task = ganttTasks.find(t => t.id === selectedTaskId);
    if (!selectedDate || !task) return;

    updateGanttTask.mutate({
      id: selectedTaskId,
      data: {
        time_type: 'milestone',
        start_date: format(selectedDate, 'yyyy-MM-dd'),
      },
    });
  };

  const handleSetDuration = () => {
    if (!selectedDate || !selectedTaskId) return;
    // In real app, would show dialog to select end date
    updateGanttTask.mutate({
      id: selectedTaskId,
      data: {
        time_type: 'duration',
        start_date: format(selectedDate, 'yyyy-MM-dd'),
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
      },
    });
  };

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const togglePhase = (phaseId) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">專案甘特圖</h1>
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
        <Button
          variant="outline"
          onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
        >
          上月
        </Button>
        <span className="font-semibold text-lg">
          {format(currentMonth, 'yyyy年MM月')}
        </span>
        <Button
          variant="outline"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          下月
        </Button>
      </div>

      {/* Selected Task Toolbar */}
      {selectedTaskId && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-sm font-medium text-gray-900">
              已選任務 | 已選日期：{selectedDate ? format(selectedDate, 'MM/dd') : '未選'}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetMilestone}
                disabled={!selectedDate}
              >
                里程碑
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetDuration}
                disabled={!selectedDate}
              >
                區間
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetRolling}
                disabled={!selectedDate}
              >
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

      {/* Gantt Table */}
      <Card className="overflow-x-auto">
        <div className="flex">
          {/* Left Panel - Project Tree */}
          <div className="w-64 border-r border-gray-200 bg-gray-50">
            <div className="sticky top-0 bg-gray-100 border-b p-3 font-semibold text-sm">
              專案名稱
            </div>
            <div className="max-h-96 overflow-y-auto">
              {ganttProjects.map((project) => (
                <div key={project.id} className="border-b">
                  {/* Project Row */}
                  <div
                    className="flex items-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 cursor-pointer font-medium text-sm"
                    onClick={() => toggleProject(project.id)}
                  >
                    {expandedProjects[project.id] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="truncate">{project.name}</span>
                  </div>

                  {expandedProjects[project.id] && (
                    <>
                      {ganttPhases
                        .filter(p => p.gantt_project_id === project.id)
                        .map((phase) => (
                          <div key={phase.id} className="ml-4 border-b">
                            {/* Phase Row */}
                            <div
                              className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer font-medium text-sm"
                              onClick={() => togglePhase(phase.id)}
                            >
                              {expandedPhases[phase.id] ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span className="truncate">{phase.name}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="ml-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentPhaseId(phase.id);
                                  setShowAddTaskDialog(true);
                                }}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>

                            {expandedPhases[phase.id] && (
                              <>
                                {ganttTasks
                                  .filter(t => t.gantt_phase_id === phase.id)
                                  .map((task) => (
                                    <div
                                      key={task.id}
                                      className={`ml-8 p-3 border-b text-xs cursor-pointer hover:bg-blue-50 ${
                                        selectedTaskId === task.id ? 'bg-blue-100' : 'bg-white'
                                      }`}
                                      onClick={() => handleTaskClick(task.id)}
                                    >
                                      {task.name}
                                    </div>
                                  ))}
                              </>
                            )}
                          </div>
                        ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Timeline */}
          <div className="flex-1 overflow-x-auto">
            <div className="sticky top-0 bg-gray-100 border-b">
              {/* Month Header */}
              <div className="flex">
                {weeks.map((week, idx) => (
                  <div
                    key={idx}
                    className="flex border-r border-gray-200"
                    style={{ width: '280px' }}
                  >
                    {week.map((day) => (
                      <div
                        key={day.toISOString()}
                        className="flex-1 border-r border-gray-200 p-2 text-center text-xs font-semibold"
                        style={{ minWidth: '40px' }}
                      >
                        {format(day, 'd')}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Rows */}
            {ganttProjects.map((project) => (
              <div key={project.id}>
                {expandedProjects[project.id] && (
                  <>
                    {ganttPhases
                      .filter(p => p.gantt_project_id === project.id)
                      .map((phase) => (
                        <div key={phase.id}>
                          {expandedPhases[phase.id] && (
                            <>
                              {ganttTasks
                                .filter(t => t.gantt_phase_id === phase.id)
                                .map((task) => (
                                  <div
                                    key={task.id}
                                    className={`flex border-b h-10 ${
                                      selectedTaskId === task.id ? 'bg-blue-50' : ''
                                    }`}
                                  >
                                    {weeks.map((week, idx) => (
                                      <div
                                        key={idx}
                                        className="flex border-r border-gray-200"
                                        style={{ width: '280px' }}
                                      >
                                        {week.map((day) => (
                                          <div
                                            key={day.toISOString()}
                                            className="flex-1 border-r border-gray-200 relative cursor-pointer hover:bg-yellow-50"
                                            style={{ minWidth: '40px' }}
                                            onClick={() => {
                                              handleTaskClick(task.id);
                                              handleDateClick(day);
                                            }}
                                          >
                                            {task.start_date &&
                                              format(new Date(task.start_date), 'yyyy-MM-dd') ===
                                                format(day, 'yyyy-MM-dd') &&
                                              (task.time_type === 'milestone' ? (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                  <div
                                                    className={`w-3 h-3 transform rotate-45 ${
                                                      task.is_important
                                                        ? 'bg-yellow-500'
                                                        : 'bg-blue-500'
                                                    }`}
                                                  />
                                                </div>
                                              ) : (
                                                <div className="absolute left-0 right-0 top-1/2 h-1.5 bg-blue-400 transform -translate-y-1/2" />
                                              ))}
                                            {isToday(day) && (
                                              <div className="absolute inset-0 border-l-2 border-red-500" />
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                ))}
                            </>
                          )}
                        </div>
                      ))}
                  </>
                )}
              </div>
            ))}
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
                onValueChange={(v) => {
                  setProjectFormData({ ...projectFormData, brand_id: v });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇品牌..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
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
                  <SelectItem value="SS26">SS26</SelectItem>
                  <SelectItem value="FW26">FW26</SelectItem>
                  <SelectItem value="HO26">HO26</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              disabled={!projectFormData.brand_id || !projectFormData.season || createGanttProject.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createGanttProject.isPending ? '建立中...' : '下一步'}
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
            {projectFormData.brand_id && (
              <>
                <p className="text-sm text-gray-600">
                  品牌：{getBrandName(projectFormData.brand_id)}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {getSamplesByBrand(projectFormData.brand_id).map((sample) => (
                    <label
                      key={sample.id}
                      className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSamples[sample.id] || false}
                        onChange={(e) =>
                          setSelectedSamples(prev => ({
                            ...prev,
                            [sample.id]: e.target.checked,
                          }))
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{sample.short_name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSelectSamplesDialog(false);
                setCreatingProjectId(null);
                setProjectFormData({ brand_id: '', season: '' });
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSelectSamples}
              disabled={Object.values(selectedSamples).every(v => !v) || bulkCreatePhases.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {bulkCreatePhases.isPending ? '建立中...' : '完成'}
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
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={taskFormData.is_important}
                  onChange={(e) =>
                    setTaskFormData({ ...taskFormData, is_important: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">標記為重要</span>
              </label>
            </div>
            <div>
              <Label>備註</Label>
              <Input
                value={taskFormData.note}
                onChange={(e) => setTaskFormData({ ...taskFormData, note: e.target.value })}
                placeholder="備註說明"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddTaskDialog(false);
                setCurrentPhaseId(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleAddTask}
              disabled={!taskFormData.name}
              className="bg-blue-600 hover:bg-blue-700"
            >
              新增任務
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}