import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, endOfMonth } from 'date-fns';
import { Loader2, CalendarRange } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import WeekCalendarTable from '@/components/calendar/WeekCalendarTable';

export default function LeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogData, setDeleteDialogData] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: loadingUser } = useQuery({
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

  // 根據登入帳號自動找到對應的員工
  const currentEmployee = employees.find(emp => emp.user_emails?.includes(currentUser?.email));

  const { data: leaveTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => base44.entities.LeaveType.list(),
  });

  const { data: holidays = [], isLoading: loadingHolidays } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  const { data: leaveRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['leaveRecords', currentDate.getFullYear(), currentDate.getMonth(), currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      if (month === -1) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        return base44.entities.LeaveRecord.filter({
          employee_id: currentEmployee.id,
          date: { $gte: startDate, $lte: endDate }
        });
      } else {
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDate = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd');
        return base44.entities.LeaveRecord.filter({
          employee_id: currentEmployee.id,
          date: { $gte: startDate, $lte: endDate }
        });
      }
    },
    enabled: !!currentEmployee?.id,
  });

  const { data: allLeaveRecords = [] } = useQuery({
    queryKey: ['allLeaveRecords', currentDate.getFullYear(), currentDate.getMonth()],
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

  const updateLeaveMutation = useMutation({
    mutationFn: async ({ employeeId, date, leaveTypeId }) => {
      const currentEmployee = employees.find(e => e.id === employeeId);
      
      // 先檢查是否已存在相同的請假記錄
      const existing = leaveRecords.find(
        r => r.employee_id === employeeId && r.date === date
      );
      if (existing && existing.leave_type_id === leaveTypeId) {
        // 如果是同一個假別，直接返回，不做任何操作也不顯示警告
        return existing;
      }
      
      // 如果不存在或假別不同，才進行衝突檢查
      // 檢查職代衝突（排除出差）
      const currentLeaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
      const isBusinessTrip = currentLeaveType?.name === '出差';

      if (!isBusinessTrip && (currentEmployee?.deputy_1 || currentEmployee?.deputy_2)) {
        const deputies = [currentEmployee.deputy_1, currentEmployee.deputy_2].filter(Boolean);
        const conflicts = allLeaveRecords.filter(r => {
          const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
          return deputies.includes(r.employee_id) && r.date === date && rLeaveType?.name !== '出差';
        });
        
        if (conflicts.length > 0) {
          const conflictNames = conflicts.map(c => {
            const emp = employees.find(e => e.id === c.employee_id);
            return emp?.name || '未知';
          }).join('、');
          
          const confirmed = window.confirm(
            `⚠️ 警告：職代 ${conflictNames} 在 ${date} 已請假，確定要繼續請假嗎？`
          );
          
          if (!confirmed) {
            throw new Error('取消請假');
          }
        }
      }
      
      // 檢查部門人數限制（排除自己和出差）
      if (!isBusinessTrip) {
      const deptLeaves = allLeaveRecords.filter(r => {
        if (r.employee_id === employeeId) return false; // 排除自己
        const emp = employees.find(e => e.id === r.employee_id);
        const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
        return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId)) && r.date === date && rLeaveType?.name !== '出差';
      });

      // 計算部門總人數（active狀態）
      const deptTotalMembers = employees.filter(e => 
        e.status === 'active' && 
        e.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId))
      ).length;

      const deptLimit = Math.floor(deptTotalMembers / 3);

      if (deptLeaves.length >= deptLimit) {
        const confirmed = window.confirm(
          `⚠️ 警告：${date} 該部門已有 ${deptLeaves.length} 人請假（超過部門1/3人數 ${deptLimit}），確定要繼續請假嗎？`
        );

        if (!confirmed) {
          throw new Error('取消請假');
        }
      }
      }

      // 計算警示資訊
      const warningTypes = [];
      const warningDetails = {};

      // 職代衝突警示（排除出差）
      if (!isBusinessTrip && (currentEmployee?.deputy_1 || currentEmployee?.deputy_2)) {
        const deputies = [currentEmployee.deputy_1, currentEmployee.deputy_2].filter(Boolean);
        const deputyConflicts = allLeaveRecords.filter(r => {
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
      const deptLeaves = allLeaveRecords.filter(r => {
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
        // 不同假別則更新
        return base44.entities.LeaveRecord.update(existing.id, {
          leave_type_id: leaveTypeId,
          warning_type: warningTypes.length > 0 ? warningTypes : undefined,
          warning_details: warningTypes.length > 0 ? warningDetails : undefined
        });
      } else {
        const newRecord = await base44.entities.LeaveRecord.create({
          employee_id: employeeId,
          date: date,
          leave_type_id: leaveTypeId,
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
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
      queryClient.invalidateQueries(['allLeaveRecords']);
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (recordId) => base44.entities.LeaveRecord.delete(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
      queryClient.invalidateQueries(['allLeaveRecords']);
    },
  });

  const deleteRangeMutation = useMutation({
    mutationFn: async (recordIds) => {
      await Promise.all(recordIds.map(id => base44.entities.LeaveRecord.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
      queryClient.invalidateQueries(['allLeaveRecords']);
    },
  });

  const rangeLeaveMutation = useMutation({
    mutationFn: async ({ employeeId, startDate, endDate, leaveTypeId }) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const currentEmployee = employees.find(e => e.id === employeeId);
      
      // 檢查是否為出差假別
      const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
      const isBusinessTrip = leaveType?.name === '出差';
      
      // 檢查每一天的衝突
      const warnings = [];
      const dates = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays?.some(h => h.date === dateStr);
        
        // 出差例外：假日也要記錄，其他假別跳過假日和週末
        if (!isBusinessTrip && (isWeekend || isHoliday)) {
          continue;
        }
        
        dates.push(dateStr);
        
        // 檢查職代衝突（排除出差）
        if (!isBusinessTrip && (currentEmployee?.deputy_1 || currentEmployee?.deputy_2)) {
          const deputies = [currentEmployee.deputy_1, currentEmployee.deputy_2].filter(Boolean);
          const conflicts = allLeaveRecords.filter(r => {
            const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
            return deputies.includes(r.employee_id) && r.date === dateStr && rLeaveType?.name !== '出差';
          });
          
          if (conflicts.length > 0) {
            const conflictNames = conflicts.map(c => {
              const emp = employees.find(e => e.id === c.employee_id);
              return emp?.name || '未知';
            }).join('、');
            warnings.push(`${dateStr}: 職代 ${conflictNames} 已請假`);
          }
        }
        
        // 檢查部門人數限制（排除自己和出差）
        if (!isBusinessTrip) {
        const deptLeaves = allLeaveRecords.filter(r => {
          if (r.employee_id === employeeId) return false; // 排除自己
          const emp = employees.find(e => e.id === r.employee_id);
          const rLeaveType = leaveTypes.find(lt => lt.id === r.leave_type_id);
          return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId)) && r.date === dateStr && rLeaveType?.name !== '出差';
        });

        // 計算部門總人數（active狀態）
        const deptTotalMembers = employees.filter(e => 
          e.status === 'active' && 
          e.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId))
        ).length;

        const deptLimit = Math.floor(deptTotalMembers / 3);

        if (deptLeaves.length > deptLimit) {
          warnings.push(`${dateStr}: 部門已有 ${deptLeaves.length} 人請假（超過1/3人數 ${deptLimit}）`);
        }
        }
        }
      
      if (warnings.length > 0) {
        const confirmed = window.confirm(
          `⚠️ 警告：\n${warnings.join('\n')}\n\n確定要繼續請假嗎？`
        );
        
        if (!confirmed) {
          throw new Error('取消請假');
        }
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
            const deputyConflicts = allLeaveRecords.filter(r => {
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
          const deptLeaves = allLeaveRecords.filter(r => {
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
        return []; // 沒有需要新增的記錄
      }
      
      return base44.entities.LeaveRecord.bulkCreate(recordsToCreate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
      queryClient.invalidateQueries(['allLeaveRecords']);
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
      queryClient.invalidateQueries(['allLeaveRecords']);
    },
  });

  const handleUpdateLeave = (employeeId, date, leaveTypeId) => {
    updateLeaveMutation.mutate({ employeeId, date, leaveTypeId });
  };

  const handleDeleteLeave = (recordId) => {
    deleteLeaveMutation.mutate(recordId);
  };

  const handleDeleteRangeLeave = (record) => {
    if (!record) return;

    // 找出同一假別的所有記錄並排序
    const sameTypeRecords = leaveRecords.filter(r => 
      r.employee_id === record.employee_id && 
      r.leave_type_id === record.leave_type_id
    ).sort((a, b) => a.date.localeCompare(b.date));

    if (sameTypeRecords.length === 0) return;

    // 找出包含點擊日期的連續區間
    const rangeRecords = [record];
    const recordIndex = sameTypeRecords.findIndex(r => r.id === record.id);

    // 向前找連續日期
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

    // 向後找連續日期
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

    // 如果是區間（超過1天），顯示對話框讓使用者選擇
    if (rangeRecords.length > 1) {
      const startDate = rangeRecords[0].date;
      const endDate = rangeRecords[rangeRecords.length - 1].date;
      setDeleteDialogData({
        record,
        rangeRecords,
        startDate,
        endDate,
        count: rangeRecords.length
      });
      setDeleteDialogOpen(true);
    } else {
      // 單天直接刪除
      deleteLeaveMutation.mutate(record.id);
    }
  };

  const handleDeleteConfirm = (action) => {
    if (!deleteDialogData) return;

    if (action === 'single') {
      // 只刪除單日
      deleteLeaveMutation.mutate(deleteDialogData.record.id);
    } else if (action === 'range') {
      // 刪除整個區間
      deleteRangeMutation.mutate(deleteDialogData.rangeRecords.map(r => r.id));
    }

    setDeleteDialogOpen(false);
    setDeleteDialogData(null);
  };

  const handleRangeSubmit = async () => {
    if (!dateRange?.from || !dateRange?.to || !selectedLeaveTypeId || !currentEmployee) return;
    
    await rangeLeaveMutation.mutateAsync({ 
      employeeId: currentEmployee.id, 
      startDate: dateRange.from, 
      endDate: dateRange.to, 
      leaveTypeId: selectedLeaveTypeId 
    });
    
    setRangeMode(false);
    setDateRange({ from: undefined, to: undefined });
  };

  const handleCellClickInRangeMode = (date) => {
    if (!dateRange.from) {
      setDateRange({ from: date, to: undefined });
    } else if (!dateRange.to) {
      if (date >= dateRange.from) {
        setDateRange({ ...dateRange, to: date });
      } else {
        setDateRange({ from: date, to: dateRange.from });
      }
    } else {
      setDateRange({ from: date, to: undefined });
    }
  };

  const handleReorderEmployees = async (departmentId, sourceIndex, destinationIndex) => {
    const deptEmployees = employees.filter(e => e.department_ids?.includes(departmentId));
    const sourceEmp = deptEmployees[sourceIndex];
    const destEmp = deptEmployees[destinationIndex];
    
    const sourceSortOrder = sourceEmp.sort_order ?? sourceIndex;
    const destSortOrder = destEmp.sort_order ?? destinationIndex;
    
    await base44.entities.Employee.update(sourceEmp.id, { sort_order: destSortOrder });
    await base44.entities.Employee.update(destEmp.id, { sort_order: sourceSortOrder });
    
    queryClient.invalidateQueries(['employees']);
  };

  const isLoading = loadingUser || loadingDepts || loadingEmps || loadingTypes || loadingRecords || loadingHolidays;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-gray-600">載入中...</span>
        </div>
      </div>
    );
  }

  if (!currentEmployee && !loadingEmps && !loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">找不到員工資料</h2>
          <p className="text-gray-600 mb-4">
            您的帳號 <span className="font-semibold">{currentUser?.email}</span> 尚未綁定員工資料
          </p>
          <p className="text-sm text-gray-500">
            請聯絡管理員在「員工管理」頁面將您的帳號綁定到員工資料
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-8 sm:p-6">
      <div className="max-w-full mx-auto">
        {/* 標題和日期選擇器 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">我的排休</h1>
          <div className="md:hidden">
            <CalendarHeader 
              currentDate={currentDate} 
              onDateChange={setCurrentDate}
            />
          </div>
        </div>

          <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
              <Select 
                value={selectedLeaveTypeId || ''} 
                onValueChange={(value) => setSelectedLeaveTypeId(value || null)}
                disabled={rangeMode}
              >
                <SelectTrigger className="w-[200px]">
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
                      alert('請先選擇假別');
                      return;
                    }
                    setRangeMode(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="icon"
                >
                  <CalendarRange className="h-5 w-5" />
                </Button>
              ) : (
                <Popover open={dateRange.from && dateRange.to}>
                  <PopoverTrigger asChild>
                    <Button
                      onClick={() => {
                        if (!dateRange.from || !dateRange.to) {
                          setRangeMode(false);
                          setDateRange({ from: undefined, to: undefined });
                        }
                      }}
                      variant="outline"
                      size="icon"
                      className={dateRange.from && dateRange.to ? 'bg-green-50 border-green-500' : ''}
                    >
                      {dateRange.from && dateRange.to ? '✓' : '✕'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm">確認區間請假</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {dateRange.from} 至 {dateRange.to}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setRangeMode(false);
                            setDateRange({ from: undefined, to: undefined });
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          取消
                        </Button>
                        <Button
                          onClick={handleRangeSubmit}
                          disabled={rangeLeaveMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 flex-1"
                          size="sm"
                        >
                          {rangeLeaveMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              處理中
                            </>
                          ) : (
                            '確定'
                          )}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              </div>
              {rangeMode && (
                <p className="text-xs text-blue-600 w-full md:flex-1">
                  {!dateRange.from && "📍 請在下方日曆點擊選擇起始日期"}
                  {dateRange.from && !dateRange.to && `📍 已選開始：${dateRange.from} - 請選擇結束日期`}
                  {dateRange.from && dateRange.to && `✓ 已選區間：${dateRange.from} 至 ${dateRange.to} - 點擊左側按鈕確認`}
                </p>
              )}
            </div>
          </div>

          <WeekCalendarTable
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            currentEmployee={currentEmployee}
            currentDepartments={departments.filter(d => currentEmployee?.department_ids?.includes(d.id))}
            leaveRecords={leaveRecords}
            leaveTypes={leaveTypes}
            holidays={holidays}
            selectedLeaveTypeId={selectedLeaveTypeId}
            rangeMode={rangeMode}
            dateRange={dateRange}
            onUpdateLeave={handleUpdateLeave}
            onDeleteLeave={handleDeleteLeave}
            onDeleteRangeLeave={handleDeleteRangeLeave}
            onCellClickInRangeMode={handleCellClickInRangeMode}
          />

          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1">操作說明</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <span className="font-medium">選擇假別</span>：從下拉選單選擇要請的假別</li>
                  <li>• <span className="font-medium">單天請假</span>：選好假別後，單擊格子填充</li>
                  <li>• <span className="font-medium">區間請假</span>：選好假別後，點擊 📅 按鈕，在下方日曆選擇區間，按確定完成</li>
                  <li>• <span className="font-medium">雙擊格子</span>：取消請假（連續假期會一起取消）</li>
                  <li>• <span className="font-medium">自動警示</span>：同職代衝突或部門超過1/3成員請假時會提醒</li>
                </ul>
              </div>
              <div className="border-t border-gray-300 pt-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">假別圖例</h4>
                <div className="flex flex-wrap gap-3">
                  {leaveTypes?.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)).map((lt) => (
                    <div key={lt.id} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lt.color }} />
                      <span className="text-xs text-gray-600">{lt.short_name} = {lt.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 刪除確認對話框 */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>取消請假</DialogTitle>
                <DialogDescription>
                  檢測到連續假期：{deleteDialogData?.startDate} 至 {deleteDialogData?.endDate} 共 {deleteDialogData?.count} 天
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeleteDialogData(null);
                  }}
                >
                  取消
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteConfirm('single')}
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  取消單日 ({deleteDialogData?.record?.date})
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteConfirm('range')}
                >
                  全部取消 ({deleteDialogData?.count} 天)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
          </div>
          );
          }