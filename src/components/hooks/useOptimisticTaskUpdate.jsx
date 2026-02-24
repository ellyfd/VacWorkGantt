import { useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useOptimisticTaskUpdate() {
  const queryClient = useQueryClient();
  
  const updateGanttTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GanttTask.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['ganttTasks']),
  });

  const update = useCallback((id, data) => {
    const previous = queryClient.getQueryData(['ganttTasks']);
    queryClient.setQueryData(['ganttTasks'],
      previous?.map(t => t.id === id ? { ...t, ...data } : t)
    );
    updateGanttTask.mutate({ id, data }, {
      onError: () => queryClient.setQueryData(['ganttTasks'], previous),
    });
  }, [queryClient, updateGanttTask]);

  return update;
}