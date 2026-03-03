import { useState } from 'react';

export function useDialogState() {
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [showRollingDialog, setShowRollingDialog] = useState(false);
  const [showImportScheduleDialog, setShowImportScheduleDialog] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  return {
    showAddProjectDialog, setShowAddProjectDialog,
    showEditProjectDialog, setShowEditProjectDialog,
    editingProject, setEditingProject,
    showAddTaskDialog, setShowAddTaskDialog,
    showMilestoneDialog, setShowMilestoneDialog,
    showDurationDialog, setShowDurationDialog,
    showRollingDialog, setShowRollingDialog,
    showImportScheduleDialog, setShowImportScheduleDialog,
    showEditPhaseDialog, setShowEditPhaseDialog,
    showEditTaskDialog, setShowEditTaskDialog,
    editingTask, setEditingTask,
    editingProjectTasks, setEditingProjectTasks,
    editingPhase, setEditingPhase,
    editingPhaseName, setEditingPhaseName,
    editingPhaseTasks, setEditingPhaseTasks,
    newTaskName, setNewTaskName,
    deleteConfirm, setDeleteConfirm,
  };
}