// 共用參考資料查詢設定。
// 同一個 queryKey 在全站只能對應一種 queryFn，否則先掛載的頁面
// 會用不同形狀的資料污染快取（例如有無過濾 hidden 部門）。
// 各頁面請 spread 這裡的物件使用：useQuery(employeesQuery) 或
// useQuery({ ...employeesQuery, enabled: ... })。
import { base44 } from '@/api/base44Client';

// 參考資料（人員/部門/假別/假日等）變動頻率低，5 分鐘內視為新鮮
const REFERENCE_STALE_TIME = 5 * 60 * 1000;

export const currentUserQuery = {
  queryKey: ['currentUser'],
  queryFn: () => base44.auth.me(),
  staleTime: REFERENCE_STALE_TIME,
};

export const employeesQuery = {
  queryKey: ['employees'],
  queryFn: () => base44.entities.Employee.list('name'),
  staleTime: REFERENCE_STALE_TIME,
};

// 不過濾 hidden：canonical 資料是完整集合，
// 需要隱藏 hidden 部門的頁面請用 filterVisibleDepartments + useMemo
export const departmentsQuery = {
  queryKey: ['departments'],
  queryFn: () => base44.entities.Department.list('sort_order'),
  staleTime: REFERENCE_STALE_TIME,
};

export const filterVisibleDepartments = (departments) =>
  departments.filter((d) => d.status !== 'hidden');

export const leaveTypesQuery = {
  queryKey: ['leaveTypes'],
  queryFn: async () => {
    const types = await base44.entities.LeaveType.list('sort_order');
    return types.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
  },
  staleTime: REFERENCE_STALE_TIME,
};

export const holidaysQuery = {
  queryKey: ['holidays'],
  queryFn: () => base44.entities.Holiday.list('date'),
  staleTime: REFERENCE_STALE_TIME,
};

export const groupsQuery = {
  queryKey: ['groups'],
  queryFn: () => base44.entities.Group.list('sort_order'),
  staleTime: REFERENCE_STALE_TIME,
};

export const projectsQuery = {
  queryKey: ['projects'],
  queryFn: () => base44.entities.Project.list('sort_order'),
  staleTime: REFERENCE_STALE_TIME,
};

export const samplesQuery = {
  queryKey: ['samples'],
  queryFn: () => base44.entities.Sample.list('sort_order'),
  staleTime: REFERENCE_STALE_TIME,
};

export const ganttProjectsQuery = {
  queryKey: ['ganttProjects'],
  queryFn: () => base44.entities.GanttProject.list('sort_order'),
  staleTime: REFERENCE_STALE_TIME,
};

export const ganttTasksQuery = {
  queryKey: ['ganttTasks'],
  queryFn: () => base44.entities.GanttTask.list('sort_order'),
  staleTime: REFERENCE_STALE_TIME,
};

// 從 employees 快取找綁定員工，避免再打一次全表查詢
export const boundEmployeeQuery = (queryClient, email) => ({
  queryKey: ['boundEmployee', email],
  queryFn: async () => {
    const employees = await queryClient.ensureQueryData(employeesQuery);
    return employees.find((e) => e.user_emails?.includes(email)) || null;
  },
  enabled: !!email,
  staleTime: REFERENCE_STALE_TIME,
});
