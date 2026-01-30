import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function ProjectTree({ projects, phases, tasks, expanded, setExpanded }) {
  const handleToggle = (key) => {
    setExpanded(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  return (
    <div className="bg-white border-r border-gray-200 overflow-y-auto" style={{ width: '300px' }}>
      <div className="p-4 space-y-2">
        {projects.map((project) => {
          const projectKey = `project-${project.id}`;
          const projectExpanded = expanded.includes(projectKey);
          const projectPhases = phases.filter(p => p.project_id === project.id);

          return (
            <div key={project.id}>
              <button
                onClick={() => handleToggle(projectKey)}
                className="w-full flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold text-gray-800"
              >
                {projectPhases.length > 0 && (
                  projectExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                )}
                <span className="flex-1 text-left">{project.name}</span>
              </button>

              {projectExpanded && projectPhases.map((phase) => {
                const phaseKey = `phase-${phase.id}`;
                const phaseExpanded = expanded.includes(phaseKey);
                const phaseTasks = tasks.filter(t => t.phase_id === phase.id);

                return (
                  <div key={phase.id} className="ml-4">
                    <button
                      onClick={() => handleToggle(phaseKey)}
                      className="w-full flex items-center gap-2 px-2 py-1 hover:bg-blue-50 rounded text-xs text-gray-700 border-l-2 border-blue-300"
                    >
                      {phaseTasks.length > 0 && (
                        phaseExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                      )}
                      <span className="flex-1 text-left">{phase.phase_type}</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {phase.time_type === 'milestone' ? '◆' : '□'}
                      </span>
                    </button>

                    {phaseExpanded && phaseTasks.map((task) => (
                      <div key={task.id} className="ml-4 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded border-l-2 border-gray-200">
                        {task.name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}