import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, BarChart3 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import ProjectTree from '@/components/gantt/ProjectTree';
import GanttTimeline from '@/components/gantt/GanttTimeline';

export default function GanttManagement() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expanded, setExpanded] = useState(['project-0']);

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

  const isLoading = loadingProjects || loadingPhases || loadingTasks;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">專案甘特圖</h1>
          </div>
          <div className="flex items-center gap-3">
            <CalendarHeader currentDate={currentDate} onDateChange={setCurrentDate} />
            <Link to={createPageUrl('ProjectManagement')}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                + 新增專案
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <ProjectTree 
          projects={projects}
          phases={phases}
          tasks={tasks}
          expanded={expanded}
          setExpanded={setExpanded}
        />
        <GanttTimeline 
          currentDate={currentDate}
          projects={projects}
          phases={phases}
          tasks={tasks}
          employees={employees}
        />
      </div>
    </div>
  );
}