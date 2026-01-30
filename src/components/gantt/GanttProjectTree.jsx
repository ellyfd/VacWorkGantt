import React from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function GanttProjectTree({
  projects,
  phases,
  tasks,
  employees,
  expandedProjects,
  expandedPhases,
  onToggleProject,
  onTogglePhase,
  onAddPhase,
  onAddTask,
  onRowClick,
  filterText = ''
}) {
  const getEmployeeName = (assigneeId) => {
    const emp = employees.find(e => e.id === assigneeId);
    return emp ? emp.name : '-';
  };

  // 篩選專案
  const filteredProjects = filterText
    ? projects.filter(p => 
        p.name?.toLowerCase().includes(filterText.toLowerCase()) ||
        p.brand_name?.toLowerCase().includes(filterText.toLowerCase())
      )
    : projects;

  return (
    <div className="flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
      {/* 標題列 */}
      <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
        <div className="w-[180px] min-w-[180px] px-2 py-2 text-xs font-semibold text-gray-600 border-r border-gray-200">
          名稱
        </div>
        <div className="w-[80px] min-w-[80px] px-2 py-2 text-xs font-semibold text-gray-600 text-center">
          負責人
        </div>
      </div>

      {/* 專案列表 */}
      {filteredProjects.map((project) => {
        const projectPhases = phases.filter(p => p.project_id === project.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const isExpanded = expandedProjects[project.id];

        return (
          <div key={project.id}>
            {/* 專案列 - 第一階 */}
            <div 
              className="flex border-b border-gray-100 hover:bg-blue-50 cursor-pointer group h-9"
              onClick={() => onToggleProject(project.id)}
            >
              <div className="w-[180px] min-w-[180px] px-2 flex items-center gap-1 border-r border-gray-200">
                {projectPhases.length > 0 ? (
                  isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
                ) : <div className="w-4" />}
                <span className="text-sm font-medium text-gray-800 truncate">{project.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); onAddPhase(project.id); }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="w-[80px] min-w-[80px] flex items-center justify-center text-xs text-gray-500">
                -
              </div>
            </div>

            {/* 階段列 - 第二階 */}
            {isExpanded && projectPhases.map((phase) => {
              const phaseTasks = tasks.filter(t => t.phase_id === phase.id)
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
              const isPhaseExpanded = expandedPhases[phase.id];

              return (
                <div key={phase.id}>
                  <div 
                    className="flex border-b border-gray-100 hover:bg-gray-50 cursor-pointer group h-9"
                    onClick={() => onTogglePhase(phase.id)}
                  >
                    <div className="w-[180px] min-w-[180px] px-2 pl-6 flex items-center gap-1 border-r border-gray-200">
                      {phaseTasks.length > 0 ? (
                        isPhaseExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
                      ) : <div className="w-4" />}
                      <span className="text-sm text-gray-700 truncate">{phase.phase_type}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); onAddTask(phase.id); }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div 
                      className="w-[80px] min-w-[80px] flex items-center justify-center text-xs text-gray-600"
                      onClick={(e) => { e.stopPropagation(); onRowClick(phase, 'phase'); }}
                    >
                      {getEmployeeName(phase.assignee_id)}
                    </div>
                  </div>

                  {/* 任務列 - 第三階 */}
                  {isPhaseExpanded && phaseTasks.map((task) => (
                    <div 
                      key={task.id}
                      className="flex border-b border-gray-100 hover:bg-gray-50 cursor-pointer h-9"
                      onClick={() => onRowClick(task, 'task')}
                    >
                      <div className="w-[180px] min-w-[180px] px-2 pl-10 flex items-center border-r border-gray-200">
                        <span className="text-xs text-gray-600 truncate">{task.name}</span>
                      </div>
                      <div className="w-[80px] min-w-[80px] flex items-center justify-center text-xs text-gray-500">
                        {getEmployeeName(task.assignee_id)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}

      {filteredProjects.length === 0 && (
        <div className="p-4 text-center text-gray-400 text-sm">
          沒有專案資料
        </div>
      )}
    </div>
  );
}