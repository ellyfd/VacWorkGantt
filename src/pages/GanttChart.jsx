import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, getDaysInMonth, getDay, addMonths, subMonths } from "date-fns";
import { Loader2, Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  GanttLeaveRow,
  GanttProjectTree,
  GanttTimeline,
  GanttEditDialog,
} from '@/components/gantt';

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const PHASE_TYPES = ['3D Proto', '3D LA', '3D JSS', '3D RS'];

export default function GanttChart() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterText, setFilterText] = useState('');
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedPhases, setExpandedPhases] = useState({});
  
  // Dialogs
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);

  // New project form
  const [newProject, setNewProject] = useState({ name: '', brand_name: '', season: 'SS26', year: 2026 });
  const [newTask, setNewTask] = useState({ name: '' });

  // Generate days array
  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dayOfWeek = getDay(date);
      return {
        day: i + 1,
        date: format(date, 'yyyy-MM-dd'),
        weekday: WEEKDAY_NAMES[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      };
    });
  }, [currentDate]);

  // Queries
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('sort_order'),
  });

  const { data: phases = [], isLoading: loadingPhases } = useQuery({
    queryKey: ['phases'],
    queryFn: () => base44.entities.Phase.list('sort_order'),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('sort_order'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('name'),
  });

  const { data: leaveRecords = [] } = useQuery({
    queryKey: ['leaveRecords', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = format(new Date(year, month, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');
      return base44.entities.LeaveRecord.filter({
        date: { $gte: startDate, $lte: endDate }
      });
    },
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => base44.entities.LeaveType.list('sort_order'),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  // Mutations
  const createProject = useMutation({
    mutationFn: async (data) => {
      const project = await base44.entities.Project.create(data);
      // 自動建立 4 個階段
      for (let i = 0; i < PHASE_TYPES.length; i++) {
        await base44.entities.Phase.create({
          project_id: project.id,
          phase_type: PHASE_TYPES[i],
          sort_order: i,
          status: 'pending',
          time_type: 'duration',
        });
      }
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['phases']);
      setShowProjectDialog(false);
      setNewProject({ name: '', brand_name: '', season: 'SS26', year: 2026 });
    },
  });

  const createTask = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setShowTaskDialog(false);
      setNewTask({ name: '' });
      setSelectedPhaseId(null);
    },
  });

  const updatePhase = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Phase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['phases']);
      setShowEditDialog(false);
      setEditingItem(null);
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setShowEditDialog(false);
      setEditingItem(null);
    },
  });

  const deletePhase = useMutation({
    mutationFn: (id) => base44.entities.Phase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['phases']);
      setShowEditDialog(false);
      setEditingItem(null);
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setShowEditDialog(false);
      setEditingItem(null);
    },
  });

  // Handlers
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleToggleProject = (projectId) => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const handleTogglePhase = (phaseId) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const handleAddTask = (phaseId) => {
    setSelectedPhaseId(phaseId);
    setShowTaskDialog(true);
  };

  const handleRowClick = (item, type) => {
    setEditingItem(item);
    setEditingType(type);
    setShowEditDialog(true);
  };

  const handleBarClick = (item, type) => {
    setEditingItem(item);
    setEditingType(type);
    setShowEditDialog(true);
  };

  const handleSaveEdit = (data) => {
    if (editingType === 'phase') {
      updatePhase.mutate({ id: data.id, data });
    } else {
      updateTask.mutate({ id: data.id, data });
    }
  };

  const handleDeleteEdit = (id) => {
    if (editingType === 'phase') {
      deletePhase.mutate(id);
    } else {
      deleteTask.mutate(id);
    }
  };

  const handleCreateProject = () => {
    const name = `${newProject.brand_name} ${newProject.season}`;
    createProject.mutate({ ...newProject, name });
  };

  const handleCreateTask = () => {
    if (selectedPhaseId && newTask.name) {
      createTask.mutate({
        phase_id: selectedPhaseId,
        name: newTask.name,
        status: 'pending',
        time_type: 'milestone',
      });
    }
  };

  const isLoading = loadingProjects || loadingPhases || loadingTasks;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-xl font-bold text-gray-800">專案甘特圖</h1>
        <div className="flex items-center gap-3">
          {/* 搜尋 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜尋專案..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          {/* 月份切換 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Select
              value={currentDate.getFullYear().toString()}
              onValueChange={(v) => setCurrentDate(new Date(parseInt(v), currentDate.getMonth(), 1))}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}年</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={currentDate.getMonth().toString()}
              onValueChange={(v) => setCurrentDate(new Date(currentDate.getFullYear(), parseInt(v), 1))}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>{i + 1}月</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {/* 新增專案 */}
          <Button onClick={() => setShowProjectDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增專案
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Left: Project Tree */}
        <GanttProjectTree
          projects={projects}
          phases={phases}
          tasks={tasks}
          employees={employees}
          expandedProjects={expandedProjects}
          expandedPhases={expandedPhases}
          onToggleProject={handleToggleProject}
          onTogglePhase={handleTogglePhase}
          onAddTask={handleAddTask}
          onRowClick={handleRowClick}
          filterText={filterText}
        />

        {/* Right: Timeline */}
        <div className="flex-1 overflow-auto">
          {/* Leave Row */}
          <GanttLeaveRow
            employees={employees}
            leaveRecords={leaveRecords}
            leaveTypes={leaveTypes}
            holidays={holidays}
            days={days}
          />

          {/* Timeline */}
          <GanttTimeline
            days={days}
            holidays={holidays}
            projects={projects}
            phases={phases}
            tasks={tasks}
            expandedProjects={expandedProjects}
            expandedPhases={expandedPhases}
            onBarClick={handleBarClick}
            filterText={filterText}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rotate-45" />
          <span>Milestone 里程碑</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 bg-blue-500 rounded" />
          <span>Duration 時間區間</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 rounded" style={{ background: 'repeating-linear-gradient(90deg, #3b82f6, #3b82f6 4px, #2563eb 4px, #2563eb 8px)' }} />
          <span>Rolling 持續進行</span>
        </div>
      </div>

      {/* New Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增專案</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>品牌名稱</Label>
              <Input
                value={newProject.brand_name}
                onChange={(e) => setNewProject({ ...newProject, brand_name: e.target.value })}
                placeholder="例：iPhone"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>季節</Label>
                <Select
                  value={newProject.season}
                  onValueChange={(v) => setNewProject({ ...newProject, season: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['SS25', 'FW25', 'SS26', 'FW26', 'SS27', 'FW27'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>年份</Label>
                <Select
                  value={newProject.year.toString()}
                  onValueChange={(v) => setNewProject({ ...newProject, year: parseInt(v) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>取消</Button>
            <Button onClick={handleCreateProject} disabled={!newProject.brand_name || createProject.isPending}>
              {createProject.isPending ? '建立中...' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增任務</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>任務名稱</Label>
              <Input
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                placeholder="例：設計3D原型"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>取消</Button>
            <Button onClick={handleCreateTask} disabled={!newTask.name || createTask.isPending}>
              {createTask.isPending ? '建立中...' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <GanttEditDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        item={editingItem}
        itemType={editingType}
        employees={employees}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEdit}
        isSubmitting={updatePhase.isPending || updateTask.isPending}
      />
    </div>
  );
}