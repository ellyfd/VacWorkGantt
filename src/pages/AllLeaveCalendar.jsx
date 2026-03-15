import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, endOfMonth } from 'date-fns';
import { Loader2, CalendarRange } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import CalendarHeader from '@/components/calendar/CalendarHeader';
import LeaveCalendarTable from '@/components/calendar/LeaveCalendarTable';
import { getLeavePeriod } from '@/lib/leaveUtils';
import { useToast } from '@/components/ui/use-toast';
import { useConfirmDialog } from '@/components/hooks/useConfirmDialog';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function AllLeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined, employeeId: undefined });
  const [summaryEmployee, setSummaryEmployee] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmProps, confirm] = useConfirmDialog();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const depts = await base44.entities.Department.list('sort_order');
      return depts.filter(d => d.status !== 'hidden');
    },
  });

  const { data: employees = [], isLoading: loadingEmps } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const emps = await base44.entities.Employee.list('name');
      return emps;
    },
  });

  const { data: leaveTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => base44.entities.LeaveType.list(),
  });

  const { data: holidays = [], isLoading: loadingHolidays } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  const { data: leaveRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['leaveRecords', currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      if (month === -1) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        return base44.entities.LeaveRecord.filter({
          date: { $gte: startDate, $lte: endDate }
        });
      } else {
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDate = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd');
        return base44.entities.LeaveRecord.filter({
          date: { $gte: startDate, $lte: endDate }
        });
      }
    },
  });

  // 預建 Map 用於 O(1) 查詢
  const employeeMap = React.useMemo(() =>
    Object.fromEntries(employees.map(e => [e.id, e])),
    [employees]
  );

  const leaveTypeMap = React.useMemo(() =>
    Object.fromEntries(leaveTypes.map(lt => [lt.id, lt])),
    [leaveTypes]
  );

  const queryKey = [currentDate.getFullYear(), currentDate.getMonth()];

  const updateLeaveMutation = useMutation({
    mutationFn: async ({ employeeId, date, leaveTypeId }) => {
      const currentEmployee = employeeMap[employeeId];
      const currentLeaveType = leaveTypeMap[leaveTypeId];
      const isBusinessTrip = currentLeaveType?.name === '出差';
      const period = getLeavePeriod(currentLeaveType?.name);

      const existing = leaveRecords.find(
        r => r.employee_id === employeeId && r.date === date && (r.period || 'full') === period
      );
      
      if (existing && existing.leave_type_id === leaveTypeId) {
        return existing;
      }

      if (!isBusinessTrip && (currentEmployee?.deputy_1 || currentEmployee?.deputy_2)) {
        const deputies = [currentEmployee.deputy_1, currentEmployee.deputy_2].filter(Boolean);
        const conflicts = leaveRecords.filter(r => {
          const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
          return deputies.includes(r.employee_id) && r.date === date && rLeaveType?.name !== '出差';
        });
        
        if (conflicts.length > 0) {
          const conflictNames = conflicts.map(c => {
            const emp = employees.find(e => e.id === c.employee_id);
            return emp?.name || '未知';
          }).join('、');
          
          const confirmed = await confirm(
            `職代 ${conflictNames} 在 ${date} 已請假，確定要繼續請假嗎？`,
            { title: '職代衝突警告', confirmText: '繼續請假', variant: 'destructive' }
          );
          if (!confirmed) throw new Error('取消請假');
        }
      }
      
      // 檢查部門人數限制（排除出差）
      if (!isBusinessTrip) {
      const deptLeaves = leaveRecords.filter(r => {
        if (r.employee_id === employeeId) return false;
        const emp = employees.find(e => e.id === r.employee_id);
        const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
        return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId)) && r.date === date && rLeaveType?.name !== '出差';
      });
      const deptTotalMembers = employees.filter(e => 
        e.status === 'active' && 
        e.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId))
      ).length;
      const deptLimit = Math.floor(deptTotalMembers / 3);

      if (deptLeaves.length >= deptLimit) {
        const confirmed = await confirm(
          `${date} 該部門已有 ${deptLeaves.length} 人請假（超過部門 1/3 人數上限 ${deptLimit}），確定要繼續？`,
          { title: '部門請假超標警告', confirmText: '繼續請假', variant: 'destructive' }
        );
        if (!confirmed) throw new Error('取消請假');
      }
      }
      
      // 計算警示資訊
      const warningTypes = [];
      const warningDetails = {};
      
      // 職代衝突警示（排除出差）
      if (!isBusinessTrip && (currentEmployee?.deputy_1 || currentEmployee?.deputy_2)) {
        const deputies = [currentEmployee.deputy_1, currentEmployee.deputy_2].filter(Boolean);
        const deputyConflicts = leaveRecords.filter(r => {
          const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
          return deputies.includes(r.employee_id) && r.date === date && rLeaveType?.name !== '出差';
        });
        
        if (deputyConflicts.length > 0) {
          warningTypes.push('deputy_conflict');
          warningDetails.deputy_conflicts = deputyConflicts.map(c => {
            const emp = employees.find(e => e.id === c.employee_id);
            const lt = leaveTypes.find(l => l.id === c.leave_type_id);
            return {
              employee_id: c.employee_id,
              employee_name: emp?.name || '未知',
              leave_type: lt?.name || '未知'
            };
          });
        }
      }
      
      // 部門人數警示（排除出差）
      if (!isBusinessTrip) {
      const deptLeaves = leaveRecords.filter(r => {
        if (r.employee_id === employeeId) return false;
        const emp = employees.find(e => e.id === r.employee_id);
        const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
        return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId)) && r.date === date && rLeaveType?.name !== '出差';
      });
      const deptTotalMembers = employees.filter(e => 
        e.status === 'active' && 
        e.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId))
      ).length;
      const deptLimit = Math.floor(deptTotalMembers / 3);
      
      if (deptLeaves.length >= deptLimit) {
        warningTypes.push('department_over_limit');
        warningDetails.department_info = {
          total_members: deptTotalMembers,
          leave_count: deptLeaves.length + 1,
          limit: deptLimit,
          percentage: Math.round((deptLeaves.length + 1) / deptTotalMembers * 100)
        };
      }
      }
      
      if (existing) {
        return base44.entities.LeaveRecord.update(existing.id, {
          leave_type_id: leaveTypeId,
          period,
          warning_type: warningTypes.length > 0 ? warningTypes : undefined,
          warning_details: warningTypes.length > 0 ? warningDetails : undefined
        });
      } else {
        const newRecord = await base44.entities.LeaveRecord.create({
          employee_id: employeeId,
          date: date,
          leave_type_id: leaveTypeId,
          period,
          warning_type: warningTypes.length > 0 ? warningTypes : undefined,
          warning_details: warningTypes.length > 0 ? warningDetails : undefined
        });

        // 發送通知（並行）
        const emp = employees.find(e => e.id === employeeId);
        const leaveTypeName = leaveTypes.find(lt => lt.id === leaveTypeId)?.name || '未知假別';

        const sendNotif = async (email, message) => {
          const oldNotifications = await base44.entities.Notification.filter({ recipient_email: email, message: { $regex: date } });
          await Promise.all(oldNotifications.map(n => base44.entities.Notification.delete(n.id)));
          await base44.entities.Notification.create({ recipient_email: email, type: 'leave_created', message, related_entity_id: newRecord.id, related_entity_type: 'LeaveRecord' });
        };

        const adminEmails = employees.filter(e => e.role === 'admin' && e.user_emails?.length > 0).flatMap(e => e.user_emails);
        const deputyEmails = (emp?.deputy_1 || emp?.deputy_2)
          ? [emp.deputy_1, emp.deputy_2].filter(Boolean).flatMap(depId => employees.find(e => e.id === depId)?.user_emails || [])
          : [];

        await Promise.all([
          ...adminEmails.map(email => sendNotif(email, `${emp?.name || '未知員工'} 新增了 ${date} 的 ${leaveTypeName}`)),
          ...deputyEmails.map(email => sendNotif(email, `您的職務代理人 ${emp.name} 新增了 ${date} 的 ${leaveTypeName}`)),
        ]);

        return newRecord;
      }
    },
    onMutate: async ({ employeeId, date, leaveTypeId }) => {
      await queryClient.cancelQueries(['leaveRecords']);
      const previousRecords = queryClient.getQueryData(['leaveRecords', ...queryKey]);

      queryClient.setQueryData(['leaveRecords', ...queryKey], old => {
        const leaveType = leaveTypeMap[leaveTypeId];
        const period = getLeavePeriod(leaveType?.name);
        const existing = old?.find(r => r.employee_id === employeeId && r.date === date && (r.period || 'full') === period);
        if (existing) {
          return old.map(r =>
            r.id === existing.id ? { ...r, leave_type_id: leaveTypeId } : r
          );
        }
        return [...(old || []), {
          id: `temp-${Date.now()}`,
          employee_id: employeeId,
          date,
          leave_type_id: leaveTypeId,
          period,
        }];
      });

      return { previousRecords };
    },
    onError: (err, variables, context) => {
      if (err.message !== '取消請假') {
        queryClient.setQueryData(['leaveRecords', ...queryKey], context.previousRecords);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: async (recordId) => {
      const record = leaveRecords.find(r => r.id === recordId);
      await base44.entities.LeaveRecord.delete(recordId);
      
      if (record) {
        const emp = employees.find(e => e.id === record.employee_id);
        const leaveTypeName = leaveTypes.find(lt => lt.id === record.leave_type_id)?.name || '未知假別';
        
        const sendNotif = async (email, message) => {
          const oldNotifications = await base44.entities.Notification.filter({ recipient_email: email, message: { $regex: record.date } });
          await Promise.all(oldNotifications.map(n => base44.entities.Notification.delete(n.id)));
          await base44.entities.Notification.create({ recipient_email: email, type: 'leave_created', message, related_entity_type: 'LeaveRecord' });
        };
        const adminEmails = employees.filter(e => e.role === 'admin' && e.user_emails?.length > 0).flatMap(e => e.user_emails);
        const deputyEmails = (emp?.deputy_1 || emp?.deputy_2)
          ? [emp.deputy_1, emp.deputy_2].filter(Boolean).flatMap(depId => employees.find(e => e.id === depId)?.user_emails || [])
          : [];
        await Promise.all([
          ...adminEmails.map(email => sendNotif(email, `${emp?.name || '未知員工'} 取消了 ${record.date} 的 ${leaveTypeName}`)),
          ...deputyEmails.map(email => sendNotif(email, `您的職務代理人 ${emp.name} 取消了 ${record.date} 的 ${leaveTypeName}`)),
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
    },
  });

  const deleteRangeMutation = useMutation({
    mutationFn: async (recordIds) => {
      const recordsToDelete = leaveRecords.filter(r => recordIds.includes(r.id));
      await Promise.all(recordIds.map(id => base44.entities.LeaveRecord.delete(id)));
      
      // 合併通知：取消 N 天的假別
      if (recordsToDelete.length > 0) {
        const firstRecord = recordsToDelete[0];
        const emp = employees.find(e => e.id === firstRecord.employee_id);
        const leaveTypeName = leaveTypes.find(lt => lt.id === firstRecord.leave_type_id)?.name || '未知假別';
        const dates = [...new Set(recordsToDelete.map(r => r.date))].sort();
        const msgSuffix = dates.length === 1
          ? `${dates[0]} 的 ${leaveTypeName}`
          : `${dates[0]} 至 ${dates[dates.length - 1]} 共 ${dates.length} 天的 ${leaveTypeName}`;

        const sendNotif = async (email, message) => {
          await base44.entities.Notification.create({ recipient_email: email, type: 'leave_created', message, related_entity_type: 'LeaveRecord' });
        };
        const adminEmails = employees.filter(e => e.role === 'admin' && e.user_emails?.length > 0).flatMap(e => e.user_emails);
        const deputyEmails = (emp?.deputy_1 || emp?.deputy_2)
          ? [emp.deputy_1, emp.deputy_2].filter(Boolean).flatMap(depId => employees.find(e => e.id === depId)?.user_emails || [])
          : [];
        await Promise.all([
          ...adminEmails.map(email => sendNotif(email, `${emp?.name || '未知員工'} 取消了 ${msgSuffix}`)),
          ...deputyEmails.map(email => sendNotif(email, `您的職務代理人 ${emp.name} 取消了 ${msgSuffix}`)),
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
    },
  });

  const rangeLeaveMutation = useMutation({
    mutationFn: async ({ employeeId, startDate, endDate, leaveTypeId }) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const currentEmployee = employeeMap[employeeId];

      const leaveType = leaveTypeMap[leaveTypeId];
      const isBusinessTrip = leaveType?.name === '出差';

      const deptTotalMembers = !isBusinessTrip
        ? employees.filter(e =>
            e.status === 'active' &&
            e.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId))
          ).length
        : 0;
      const deptLimit = !isBusinessTrip ? Math.floor(deptTotalMembers / 3) : 0;

      const warnings = [];
      const dates = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays?.some(h => h.date === dateStr);

        if (!isBusinessTrip && (isWeekend || isHoliday)) {
          continue;
        }

        dates.push(dateStr);

        if (!isBusinessTrip && (currentEmployee?.deputy_1 || currentEmployee?.deputy_2)) {
          const deputies = [currentEmployee.deputy_1, currentEmployee.deputy_2].filter(Boolean);
          const conflicts = leaveRecords.filter(r => {
            const rLeaveType = leaveTypeMap[r.leave_type_id];
            return deputies.includes(r.employee_id) && r.date === dateStr && rLeaveType?.name !== '出差';
          });

          if (conflicts.length > 0) {
            const conflictNames = conflicts.map(c => {
              const emp = employeeMap[c.employee_id];
              return emp?.name || '未知';
            }).join('、');
            warnings.push(`${dateStr}: 職代 ${conflictNames} 已請假`);
          }
        }
        
        if (!isBusinessTrip) {
          const deptLeaves = leaveRecords.filter(r => {
            if (r.employee_id === employeeId) return false;
            const emp = employeeMap[r.employee_id];
            const rLeaveType = leaveTypeMap[r.leave_type_id];
            return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId))
              && r.date === dateStr
              && rLeaveType?.name !== '出差';
          });

          if (deptLeaves.length >= deptLimit) {
            warnings.push(`${dateStr}: 部門已有 ${deptLeaves.length} 人請假（達到1/3人數 ${deptLimit}）`);
          }
        }
      }

      if (warnings.length > 0) {
        const confirmed = await confirm(
          warnings.join('\n'),
          { title: '請假警告', confirmText: '繼續請假', variant: 'destructive' }
        );
        if (!confirmed) throw new Error('取消請假');
      }

      // 過濾掉已存在相同假別的日期，並計算每個日期的警示資訊
      const recordsToCreate = [];
      for (const dateStr of dates) {
        const existing = leaveRecords.find(
          r => r.employee_id === employeeId && r.date === dateStr && r.leave_type_id === leaveTypeId
        );
        if (!existing) {
          const warningTypes = [];
          const warningDetails = {};
          
          // 職代衝突警示（排除出差）
          if (!isBusinessTrip && (currentEmployee?.deputy_1 || currentEmployee?.deputy_2)) {
            const deputies = [currentEmployee.deputy_1, currentEmployee.deputy_2].filter(Boolean);
            const deputyConflicts = leaveRecords.filter(r => {
              const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
              return deputies.includes(r.employee_id) && r.date === dateStr && rLeaveType?.name !== '出差';
            });
            
            if (deputyConflicts.length > 0) {
              warningTypes.push('deputy_conflict');
              warningDetails.deputy_conflicts = deputyConflicts.map(c => {
                const emp = employees.find(e => e.id === c.employee_id);
                const lt = leaveTypes.find(l => l.id === c.leave_type_id);
                return {
                  employee_id: c.employee_id,
                  employee_name: emp?.name || '未知',
                  leave_type: lt?.name || '未知'
                };
              });
            }
          }
          
          // 部門人數警示（排除出差）
          if (!isBusinessTrip) {
          const deptLeaves = leaveRecords.filter(r => {
            if (r.employee_id === employeeId) return false;
            const emp = employees.find(e => e.id === r.employee_id);
            const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
            return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId)) && r.date === dateStr && rLeaveType?.name !== '出差';
          });
          const deptTotalMembers = employees.filter(e => 
            e.status === 'active' && 
            e.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId))
          ).length;
          const deptLimit = Math.floor(deptTotalMembers / 3);

          if (deptLeaves.length >= deptLimit) {
            warningTypes.push('department_over_limit');
            warningDetails.department_info = {
              total_members: deptTotalMembers,
              leave_count: deptLeaves.length + 1,
              limit: deptLimit,
              percentage: Math.round((deptLeaves.length + 1) / deptTotalMembers * 100)
            };
          }
          }
          
          recordsToCreate.push({
            employee_id: employeeId,
            date: dateStr,
            leave_type_id: leaveTypeId,
            warning_type: warningTypes.length > 0 ? warningTypes : undefined,
            warning_details: warningTypes.length > 0 ? warningDetails : undefined
          });
        }
      }
      
      if (recordsToCreate.length === 0) {
        return [];
      }

      return base44.entities.LeaveRecord.bulkCreate(recordsToCreate);
      },
      onMutate: async () => {
      await queryClient.cancelQueries(['leaveRecords']);
      const previousRecords = queryClient.getQueryData(['leaveRecords', ...queryKey]);
      return { previousRecords };
      },
      onError: (err, variables, context) => {
      if (err.message !== '取消請假') {
        queryClient.setQueryData(['leaveRecords', ...queryKey], context.previousRecords);
      }
      },
      onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
      },
      });

  const rangeCancelMutation = useMutation({
    mutationFn: async ({ employeeId, startDate, endDate }) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const recordsToDelete = leaveRecords.filter(r => {
        if (r.employee_id !== employeeId) return false;
        const recordDate = new Date(r.date);
        return recordDate >= start && recordDate <= end;
      });
      
      await Promise.all(
        recordsToDelete.map(r => base44.entities.LeaveRecord.delete(r.id))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
    },
  });

  const handleUpdateLeave = useCallback((employeeId, date, leaveTypeId) => {
    updateLeaveMutation.mutate({ employeeId, date, leaveTypeId });
  }, [updateLeaveMutation]);

  const handleDeleteLeave = useCallback((recordId) => {
    deleteLeaveMutation.mutate(recordId);
  }, [deleteLeaveMutation]);

  const handleDeleteRangeLeave = useCallback(async (record) => {
    if (!record) return;

    const sameTypeRecords = leaveRecords.filter(r => 
      r.employee_id === record.employee_id && 
      r.leave_type_id === record.leave_type_id
    ).sort((a, b) => a.date.localeCompare(b.date));

    if (sameTypeRecords.length === 0) return;

    const rangeRecords = [record];
    const recordIndex = sameTypeRecords.findIndex(r => r.id === record.id);

    for (let i = recordIndex - 1; i >= 0; i--) {
      const currentDate = sameTypeRecords[i].date;
      const nextDate = rangeRecords[0].date;
      
      const current = new Date(currentDate + 'T00:00:00');
      const next = new Date(nextDate + 'T00:00:00');
      const diffDays = (next - current) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        rangeRecords.unshift(sameTypeRecords[i]);
      } else {
        break;
      }
    }

    for (let i = recordIndex + 1; i < sameTypeRecords.length; i++) {
      const currentDate = rangeRecords[rangeRecords.length - 1].date;
      const nextDate = sameTypeRecords[i].date;
      
      const current = new Date(currentDate + 'T00:00:00');
      const next = new Date(nextDate + 'T00:00:00');
      const diffDays = (next - current) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        rangeRecords.push(sameTypeRecords[i]);
      } else {
        break;
      }
    }

    if (rangeRecords.length > 1) {
      const startDate = rangeRecords[0].date;
      const endDate = rangeRecords[rangeRecords.length - 1].date;
      const confirmed = await confirm(
        `確定要取消 ${startDate} 至 ${endDate} 共 ${rangeRecords.length} 天的請假嗎？`,
        { title: '取消連續請假', confirmText: '全部取消', variant: 'destructive' }
      );
      if (confirmed) {
        deleteRangeMutation.mutate(rangeRecords.map(r => r.id));
      }
    } else {
      deleteLeaveMutation.mutate(record.id);
    }
  }, [leaveRecords, leaveTypes, deleteRangeMutation, deleteLeaveMutation, confirm]);

  const handleRangeSubmit = async () => {
    if (!dateRange?.from || !dateRange?.to || !selectedLeaveTypeId || !dateRange?.employeeId) return;
    
    await rangeLeaveMutation.mutateAsync({ 
      employeeId: dateRange.employeeId, 
      startDate: dateRange.from, 
      endDate: dateRange.to, 
      leaveTypeId: selectedLeaveTypeId 
    });
    
    setRangeMode(false);
    setDateRange({ from: undefined, to: undefined, employeeId: undefined });
  };

  const handleCellClickInRangeMode = useCallback((employeeId, date) => {
    if (!rangeMode) return;
    
    setDateRange(prev => {
      if (!prev.from) {
        return { from: date, to: undefined, employeeId };
      } else if (!prev.to && employeeId === prev.employeeId) {
        if (date >= prev.from) {
          return { ...prev, to: date };
        } else {
          return { from: date, to: prev.from, employeeId };
        }
      } else {
        return { from: date, to: undefined, employeeId };
      }
    });
  }, [rangeMode]);

  const filteredDepartments = selectedDepartments.length > 0
    ? departments.filter(d => selectedDepartments.includes(d.id))
    : departments;

  const handleReorderEmployees = useCallback(async (currentList, sourceIndex, destinationIndex) => {
    // Reorder the list
    const reordered = [...currentList];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, moved);

    // Update sort_order_by_dept for all affected employees
    // Use the first filtered department as context, or all departments the employees belong to
    const updates = reordered.map((emp, idx) => {
      const newSortByDept = { ...(emp.sort_order_by_dept || {}) };
      // Update sort order for every department the employee belongs to (within filtered view)
      const relevantDepts = filteredDepartments.length > 0 ? filteredDepartments : departments;
      relevantDepts.forEach(dept => {
        if (emp.department_ids?.includes(dept.id)) {
          newSortByDept[dept.id] = idx + 1;
        }
      });
      return { id: emp.id, sort_order_by_dept: newSortByDept };
    });

    // Optimistic update
    queryClient.setQueryData(['employees'], (old) => {
      if (!old) return old;
      const updateMap = Object.fromEntries(updates.map(u => [u.id, u.sort_order_by_dept]));
      return old.map(emp => updateMap[emp.id]
        ? { ...emp, sort_order_by_dept: updateMap[emp.id] }
        : emp
      );
    });

    // Persist to backend
    try {
      await Promise.all(
        updates.map(u => base44.entities.Employee.update(u.id, { sort_order_by_dept: u.sort_order_by_dept }))
      );
    } catch {
      queryClient.invalidateQueries(['employees']);
      toast({ title: '排序更新失敗', variant: 'destructive' });
    }
  }, [departments, filteredDepartments, queryClient, toast]);

  // 計算員工當月請假小計
  const getEmployeeLeaveSummary = useCallback((emp) => {
    if (!emp || !leaveRecords) return [];
    const empRecords = leaveRecords.filter(r => r.employee_id === emp.id);
    const typeCounts = {};
    empRecords.forEach(r => {
      const lt = leaveTypes.find(t => t.id === r.leave_type_id);
      if (!lt) return;
      if (!typeCounts[lt.id]) typeCounts[lt.id] = { name: lt.name, short_name: lt.short_name, color: lt.color, count: 0 };
      typeCounts[lt.id].count += (r.period === 'AM' || r.period === 'PM') ? 0.5 : 1;
    });
    return Object.values(typeCounts).sort((a, b) => b.count - a.count);
  }, [leaveRecords, leaveTypes]);

  const isLoading = loadingDepts || loadingEmps || loadingTypes || loadingRecords || loadingHolidays;

  const currentEmployee = employees.find(emp => emp.user_emails?.includes(currentUser?.email));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex gap-2 p-3 border-b border-gray-100">
            {[1,2,3].map(i => <div key={i} className="h-8 w-16 bg-gray-100 rounded animate-pulse" />)}
          </div>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-gray-50">
              <div className="h-4 w-16 bg-gray-100 rounded animate-pulse flex-shrink-0" />
              {Array.from({length: 15}, (_, j) => (
                <div key={j} className="h-8 w-7 bg-gray-50 rounded animate-pulse flex-shrink-0" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-8 sm:p-6">
      <div className="w-full">
        {/* 標題和日期選擇器 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">全部排休</h1>
          <div className="md:hidden">
            <CalendarHeader 
              currentDate={currentDate} 
              onDateChange={setCurrentDate}
            />
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="space-y-3">
              {/* 部門選擇和日期選擇器 - 桌面版水平並排 */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* 部門選擇 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 flex-shrink-0">部門：</span>
                  <div className="hidden sm:flex items-center gap-2 flex-wrap">
                    {departments.map((dept) => (
                      <label key={dept.id} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedDepartments.includes(dept.id)}
                          onChange={() => {
                            if (selectedDepartments.includes(dept.id)) {
                              setSelectedDepartments(selectedDepartments.filter(id => id !== dept.id));
                            } else {
                              setSelectedDepartments([...selectedDepartments, dept.id]);
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                  {/* 手機版下拉選單 */}
                  <div className="flex sm:hidden gap-2 flex-wrap">
                    {departments.map((dept) => (
                      <button
                        key={dept.id}
                        onClick={() => {
                          if (selectedDepartments.includes(dept.id)) {
                            setSelectedDepartments(selectedDepartments.filter(id => id !== dept.id));
                          } else {
                            setSelectedDepartments([...selectedDepartments, dept.id]);
                          }
                        }}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                          selectedDepartments.includes(dept.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        {dept.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 日期選擇器 - 桌面版右對齊 */}
                <div className="hidden md:flex flex-shrink-0">
                  <CalendarHeader 
                    currentDate={currentDate} 
                    onDateChange={setCurrentDate}
                  />
                </div>
              </div>

              {/* 假別選擇和區間按鈕 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedLeaveTypeId || ''} 
                    onValueChange={(value) => setSelectedLeaveTypeId(value || null)}
                    disabled={rangeMode}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="選擇假別" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>不選擇</SelectItem>
                      {leaveTypes?.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)).map((lt) => (
                        <SelectItem key={lt.id} value={lt.id}>
                          {lt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!rangeMode ? (
                    <Button
                      onClick={() => {
                        if (!selectedLeaveTypeId) {
                          toast({ title: '請先選擇假別', variant: 'destructive' });
                          return;
                        }
                        setRangeMode(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                      size="icon"
                    >
                      <CalendarRange className="h-5 w-5" />
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setRangeMode(false);
                          setDateRange({ from: undefined, to: undefined, employeeId: undefined });
                        }}
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0"
                      >
                        ✕
                      </Button>
                      <Button
                        onClick={handleRangeSubmit}
                        disabled={!dateRange?.from || !dateRange?.to || rangeLeaveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 flex-shrink-0"
                        size="icon"
                      >
                        {rangeLeaveMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          '✓'
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* 區間選擇提示 */}
                {rangeMode && (
                  <div className="text-xs leading-relaxed space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${!dateRange.from ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-400 line-through'}`}>
                        <span className="w-4 h-4 rounded-full bg-current text-white flex items-center justify-center text-[10px] no-underline">1</span>
                        點格子選員工和起始日
                      </div>
                      <span className="text-gray-300">→</span>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${dateRange.from && !dateRange.to ? 'bg-blue-100 text-blue-700 font-medium' : !dateRange.from ? 'text-gray-400' : 'bg-gray-100 text-gray-400 line-through'}`}>
                        <span className="w-4 h-4 rounded-full bg-current text-white flex items-center justify-center text-[10px] no-underline">2</span>
                        點同一列選結束日
                      </div>
                      <span className="text-gray-300">→</span>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${dateRange.from && dateRange.to ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-400'}`}>
                        <span className="w-4 h-4 rounded-full bg-current text-white flex items-center justify-center text-[10px] no-underline">3</span>
                        按 ✓ 確認
                      </div>
                    </div>
                    {dateRange.from && (() => {
                      const emp = employees.find(e => e.id === dateRange.employeeId);
                      return (
                        <p className="text-gray-500 pl-1">
                          {emp?.name}：{dateRange.from}{dateRange.to ? ` → ${dateRange.to}` : ' → ...'}
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <LeaveCalendarTable
            currentDate={currentDate}
            departments={filteredDepartments}
            employees={employees}
            leaveRecords={leaveRecords}
            leaveTypes={leaveTypes}
            holidays={holidays}
            selectedLeaveTypeId={selectedLeaveTypeId}
            rangeMode={rangeMode}
            dateRange={dateRange}
            selectedEmployeeId={dateRange?.employeeId}
            currentEmployeeId={currentEmployee?.id}
            onUpdateLeave={handleUpdateLeave}
            onDeleteLeave={handleDeleteLeave}
            onDeleteRangeLeave={handleDeleteRangeLeave}
            onCellClickInRangeMode={handleCellClickInRangeMode}
            onReorderEmployees={handleReorderEmployees}
            onEmployeeClick={setSummaryEmployee}
          />
          </div>
        </div>

        <details className="mt-4 text-sm text-gray-600">
          <summary className="cursor-pointer font-medium text-gray-500 hover:text-gray-700 text-sm">操作說明</summary>
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>• <span className="font-medium">填入請假</span>：先從上方選擇假別，再點擊表格中的空格即可填入</li>
              <li>• <span className="font-medium text-red-600">取消請假</span>：雙擊已填入的格子（連續假期會彈出確認視窗，可選擇取消單日或整段）</li>
              <li>• <span className="font-medium">區間請假</span>：選好假別後，點擊 📅 按鈕進入區間模式，依序點選起始和結束日期</li>
              <li>• <span className="font-medium">查看小計</span>：點擊左側姓名，可查看該員工當月請假小計</li>
              <li>• <span className="font-medium">拖曳排序</span>：拖曳姓名左側的 ⠿ 圖示可調整員工顯示順序</li>
              <li>• <span className="font-medium">標記整列／欄</span>：雙擊左側姓名或上方日期，可高亮該列或該欄方便對照</li>
            </ul>
          </div>
        </details>
      </div>
      <ConfirmDialog {...confirmProps} />

      {/* 員工請假小計 */}
      <Dialog open={!!summaryEmployee} onOpenChange={(open) => !open && setSummaryEmployee(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {summaryEmployee?.name} 的請假小計
              {summaryEmployee?.english_name && (
                <span className="text-sm font-normal text-gray-500 ml-2">{summaryEmployee.english_name}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-500 mb-2">
            {currentDate.getMonth() === -1
              ? `${currentDate.getFullYear()} 年度`
              : `${currentDate.getFullYear()} 年 ${currentDate.getMonth() + 1} 月`
            }
          </div>
          {summaryEmployee && (() => {
            const summary = getEmployeeLeaveSummary(summaryEmployee);
            const total = summary.reduce((s, item) => s + item.count, 0);
            if (summary.length === 0) {
              return <p className="text-sm text-gray-400 py-4 text-center">本期間無請假紀錄</p>;
            }
            return (
              <div className="space-y-2">
                {summary.map((item) => (
                  <div key={item.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{item.count} 天</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">合計</span>
                  <span className="text-sm font-bold text-gray-900">{total} 天</span>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}