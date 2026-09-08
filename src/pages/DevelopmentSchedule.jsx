import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ganttProjectsQuery, ganttTasksQuery, projectsQuery } from '@/lib/queries';
import { SeasonScheduleTable } from '@/components/gantt/SeasonScheduleTable';
import { Skeleton } from '@/components/ui/skeleton';

export default function DevelopmentSchedule() {
  const { data: ganttProjects = [], isLoading: projectsLoading } = useQuery(ganttProjectsQuery);
  const { data: ganttTasks = [], isLoading: tasksLoading } = useQuery(ganttTasksQuery);
  const { data: brands = [], isLoading: brandsLoading } = useQuery(projectsQuery);
  const isLoading = projectsLoading || tasksLoading || brandsLoading;
  // 已封存的開發季不顯示（封存為後端共同狀態，全站一致）
  const activeGanttProjects = useMemo(
    () => ganttProjects.filter((p) => !p.archived_at && p.status !== 'archived'),
    [ganttProjects],
  );
  const scheduledCount = useMemo(() => {
    const activeIds = new Set(activeGanttProjects.map((p) => p.id));
    return new Set(
      ganttTasks
        .filter((task) => task.start_date && activeIds.has(task.gantt_project_id))
        .map((task) => task.gantt_project_id)
    ).size;
  }, [ganttTasks, activeGanttProjects]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">開發時間表</h1>
          <p className="mt-1 text-base text-slate-500">集中比較各客人與開發季的 PROTO、LA 等工作日期，共 {scheduledCount} 個已有排程的開發季。</p>
        </header>
        {isLoading ? (
          <div className="space-y-3" aria-label="正在載入開發時間表">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <SeasonScheduleTable ganttProjects={activeGanttProjects} ganttTasks={ganttTasks} brands={brands} />
        )}
      </div>
    </main>
  );
}
