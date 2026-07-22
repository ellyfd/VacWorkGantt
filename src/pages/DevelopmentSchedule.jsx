import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { base44 } from '@/api/base44Client';
import { SeasonScheduleTable } from '@/components/gantt/SeasonScheduleTable';
import { useArchivedProjects } from '@/components/hooks/useArchivedProjects';
import { Skeleton } from '@/components/ui/skeleton';

export default function DevelopmentSchedule() {
  const { archivedMap } = useArchivedProjects();
  const { data: ganttProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['ganttProjects'],
    queryFn: () => base44.entities.GanttProject.list('sort_order'),
  });
  const { data: ganttTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['ganttTasks'],
    queryFn: () => base44.entities.GanttTask.list('sort_order'),
  });
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('sort_order'),
  });
  const isLoading = projectsLoading || tasksLoading || brandsLoading;
  const activeCount = useMemo(
    () => ganttProjects.filter((project) => !(archivedMap[project.id] || project.archived_at)).length,
    [archivedMap, ganttProjects],
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">開發時間表</h1>
          <p className="mt-1 text-sm text-slate-500">集中比較各客人與開發季的 PROTO、LA 等工作日期，共 {activeCount} 個未歸檔開發季。</p>
        </header>
        {isLoading ? (
          <div className="space-y-3" aria-label="正在載入開發時間表">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <SeasonScheduleTable ganttProjects={ganttProjects} ganttTasks={ganttTasks} brands={brands} archivedMap={archivedMap} />
        )}
      </div>
    </main>
  );
}
