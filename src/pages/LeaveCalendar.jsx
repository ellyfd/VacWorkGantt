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
import { checkDeputyConflict, checkDeptLimit, buildWarningInfo } from '@/components/utils/leaveWarnings';
import { sendLeaveNotification, sendRangeDeleteNotification } from '@/components/utils/leaveNotifications';
import { buildDeleteRange } from '@/components/utils/leaveRangeDelete';
import { getLeavePeriod } from '@/lib/leaveUtils';
import { useToast } from '@/components/ui/use-toast';
import { useConfirmDialog } from '@/components/hooks/useConfirmDialog';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function LeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogData, setDeleteDialogData] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmProps, confirm] = useConfirmDialog();

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

  // 預建 Map 用於 O(1) 查詢
  const employeeMap = React.useMemo(() =>
    Object.fromEntries(employees.map(e => [e.id, e])),
    [employees]
  );

  const leaveTypeMap = React.useMemo(() =>
    Object.fromEntries(leaveTypes.map(lt => [lt.id, lt])),
    [leaveTypes]
  );

  const leaveByDateEmpKey = React.useMemo(() => {
    const map = {};
    leaveRecords.forEach(r => {
      map[`${r.date}_${currentEmployee?.id}`] = r;
    });
    return map;
  }, [leaveRecords, currentEmployee?.id]);

  const queryKey = [currentDate.getFullYear(), currentDate.getMonth(), currentEmployee?.id];

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
      const currentEmployee = employeeMap[employeeId];
      
      const leaveType = leaveTypeMap[leaveTypeId];
      const period = getLeavePeriod(leaveType?.name);
      const isBusinessTrip = leaveType?.name === '出差';
      const existing = leaveRecords.find(
        r => r.employee_id === employeeId && r.date === date && (r.period || 'full') === period
      );
      if (existing && existing.leave_type_id === leaveTypeId) {
        return existing;
      }

      // 檢查職代衝突
      if (!isBusinessTrip) {
        const deputyConflicts = checkDeputyConflict({
          employee: currentEmployee,
          date,
          leaveTypes,
          leaveTypeId,
          allLeaveRecords,
          employees
        });
        
        if (deputyConflicts.length > 0) {
          const conflictNames = deputyConflicts.map(c => {
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
      
      // 檢查部門人數限制
      if (!isBusinessTrip) {
        const deptLimitInfo = checkDeptLimit({
          employee: currentEmployee,
          date,
          leaveTypeId,
          leaveTypes,
          allLeaveRecords,
          employees
        });
        
        if (deptLimitInfo) {
          const confirmed = await confirm(
            `${date} 該部門已有 ${deptLimitInfo.deptLeaves} 人請假（超過部門 1/3 人數上限 ${deptLimitInfo.deptLimit}），確定要繼續？`,
            { title: '部門請假超標警告', confirmText: '繼續請假', variant: 'destructive' }
          );
          if (!confirmed) throw new Error('取消請假');
        }
      }

      // 建立警示資訊
      const { warningTypes, warningDetails } = buildWarningInfo({
        employee: currentEmployee,
        date,
        leaveTypeId,
        leaveTypes,
        allLeaveRecords,
        employees
      });

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

        // 發送通知
        await sendLeaveNotification({
          employees,
          employeeId,
          date,
          leaveTypeId,
          leaveTypes,
          action: 'create',
          relatedRecord: newRecord
        });

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
        
        if (!isBusinessTrip && (isWeekend || isHoliday)) continue;
        
        dates.push(dateStr);
        
        if (!isBusinessTrip) {
          const deputyConflicts = checkDeputyConflict({
            employee: currentEmployee,
            date: dateStr,
            leaveTypes,
            leaveTypeId,
            allLeaveRecords,
            employees
          });
          
          if (deputyConflicts.length > 0) {
            const conflictNames = deputyConflicts.map(c => {
              const emp = employeeMap[c.employee_id];
              return emp?.name || '未知';
            }).join('、');
            warnings.push(`${dateStr}: 職代 ${conflictNames} 已請假`);
          }

          const deptLeaves = allLeaveRecords.filter(r => {
            if (r.employee_id === employeeId) return false;
            const emp = employeeMap[r.employee_id];
            const rLeaveType = leaveTypeMap[r.leave_type_id];
            return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId))
              && r.date === dateStr
              && rLeaveType?.name !== '出差';
          });

          if (deptLeaves.length >= deptLimit) {
            warnings.push(`${dateStr}: 部門已有 ${deptLeaves.length} 人請假（超過1/3人數 ${deptLimit}）`);
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
      
      const recordsToCreate = [];
      for (const dateStr of dates) {
        const key = `${dateStr}_${employeeId}`;
        const existing = leaveRecords.find(
          r => r.employee_id === employeeId && r.date === dateStr && r.leave_type_id === leaveTypeId
        );
        if (!existing) {
          const { warningTypes, warningDetails } = buildWarningInfo({
            employee: currentEmployee,
            date: dateStr,
            leaveTypeId,
            leaveTypes,
            allLeaveRecords,
            employees
          });
          
          recordsToCreate.push({
            employee_id: employeeId,
            date: dateStr,
            leave_type_id: leaveTypeId,
            warning_type: warningTypes.length > 0 ? warningTypes : undefined,
            warning_details: warningTypes.length > 0 ? warningDetails : undefined
          });
        }
      }
      
      return recordsToCreate.length > 0 ? base44.entities.LeaveRecord.bulkCreate(recordsToCreate) : [];
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

    const sameTypeRecords = leaveRecords.filter(r => 
      r.employee_id === record.employee_id && 
      r.leave_type_id === record.leave_type_id
    ).sort((a, b) => a.date.localeCompare(b.date));

    if (sameTypeRecords.length === 0) return;

    // 使用通用函數找出連續區間
    const rangeRecords = buildDeleteRange(record, sameTypeRecords);

    if (rangeRecords) {
      setDeleteDialogData({
        record,
        rangeRecords,
        startDate: rangeRecords[0].date,
        endDate: rangeRecords[rangeRecords.length - 1].date,
        count: rangeRecords.length
      });
      setDeleteDialogOpen(true);
    } else {
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
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-3" />
          {[1,2,3,4].map(i => (
            <div key={i} className="flex gap-1 mb-1">
              {Array.from({length: 7}, (_, j) => (
                <div key={j} className="h-10 flex-1 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ))}
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
    <div className="min-h-screen bg-gray-50 px-4 pt-5 pb-10 sm:p-6 sm:pb-10">
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

          <WeekCalendarTable
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            currentEmployee={currentEmployee}
            currentDepartments={departments.filter(d => currentEmployee?.department_ids?.includes(d.id))}
            leaveRecords={leaveRecords}
            leaveTypes={leaveTypes}
            holidays={holidays}
            selectedLeaveTypeId={selectedLeaveTypeId}
            onLeaveTypeChange={(value) => setSelectedLeaveTypeId(value || null)}
            rangeMode={rangeMode}
            dateRange={dateRange}
            onUpdateLeave={handleUpdateLeave}
            onDeleteLeave={handleDeleteLeave}
            onDeleteRangeLeave={handleDeleteRangeLeave}
            onCellClickInRangeMode={handleCellClickInRangeMode}
            onRangeModeToggle={() => {
              if (!selectedLeaveTypeId) { toast({ title: '請先選擇假別', variant: 'destructive' }); return; }
              setRangeMode(true);
            }}
            onRangeModeCancel={() => { setRangeMode(false); setDateRange({ from: undefined, to: undefined }); }}
            onRangeSubmit={handleRangeSubmit}
            rangeLeavePending={rangeLeaveMutation.isPending}
          />

          <details className="mt-4 text-sm text-gray-600">
            <summary className="cursor-pointer font-medium text-gray-500 hover:text-gray-700 text-sm">操作說明與假別圖例</summary>
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div>
                <ul className="text-xs text-gray-600 space-y-1.5">
                  <li>• <span className="font-medium">填入請假</span>：先從上方選擇假別，再點擊日曆中的日期即可填入</li>
                  <li>• <span className="font-medium text-red-600">取消請假</span>：雙擊已填入的格子（連續假期會彈出確認視窗，可選擇取消單日或整段）</li>
                  <li>• <span className="font-medium">區間請假</span>：選好假別後，點擊 📅 按鈕進入區間模式，依序點選起始和結束日期</li>
                  <li>• <span className="font-medium">自動警示</span>：職代衝突或部門超過 1/3 成員請假時，系統會跳出警告確認</li>
                </ul>
              </div>
              <div className="border-t border-gray-200 pt-3">
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
          </details>

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
          <ConfirmDialog {...confirmProps} />
          </div>
          </div>
          );
          }