import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import WeekCalendarTable from '@/components/calendar/WeekCalendarTable';
import LeaveLegend from '@/components/calendar/LeaveLegend';

import RangeLeaveDialog from '@/components/calendar/RangeLeaveDialog';

export default function LeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
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
      const emps = await base44.entities.Employee.list('sort_order');
      return emps.sort((a, b) => (a.sort_order || 999999) - (b.sort_order || 999999));
    },
  });

  // 根據登入帳號自動找到對應的員工
  const currentEmployee = employees.find(emp => emp.user_email === currentUser?.email);

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
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;
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
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;
        return base44.entities.LeaveRecord.filter({
          date: { $gte: startDate, $lte: endDate }
        });
      }
    },
  });

  const updateLeaveMutation = useMutation({
    mutationFn: async ({ employeeId, date, leaveTypeId }) => {
      // 檢查職代衝突
      const currentEmployee = employees.find(e => e.id === employeeId);
      if (currentEmployee?.code) {
        const sameCodeEmployees = employees.filter(e => 
          e.code === currentEmployee.code && e.id !== employeeId
        );
        
        const conflicts = allLeaveRecords.filter(r => 
          sameCodeEmployees.some(e => e.id === r.employee_id) && r.date === date
        );
        
        if (conflicts.length > 0) {
          const conflictNames = conflicts.map(c => {
            const emp = employees.find(e => e.id === c.employee_id);
            return emp?.name || '未知';
          }).join('、');
          
          const confirmed = window.confirm(
            `⚠️ 警告：同職代同仁 ${conflictNames} 在 ${date} 已請假，確定要繼續請假嗎？`
          );
          
          if (!confirmed) {
            throw new Error('取消請假');
          }
        }
      }
      
      // 檢查部門人數限制
      const deptLeaves = allLeaveRecords.filter(r => {
        const emp = employees.find(e => e.id === r.employee_id);
        return emp?.department_id === currentEmployee?.department_id && r.date === date;
      });
      
      if (deptLeaves.length >= 2) {
        const confirmed = window.confirm(
          `⚠️ 警告：${date} 該部門已有 ${deptLeaves.length} 人請假，確定要繼續請假嗎？`
        );
        
        if (!confirmed) {
          throw new Error('取消請假');
        }
      }

      const existing = leaveRecords.find(
        r => r.employee_id === employeeId && r.date === date
      );
      if (existing) {
        return base44.entities.LeaveRecord.update(existing.id, {
          leave_type_id: leaveTypeId
        });
      } else {
        return base44.entities.LeaveRecord.create({
          employee_id: employeeId,
          date: date,
          leave_type_id: leaveTypeId
        });
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
      
      // 檢查每一天的衝突
      const warnings = [];
      const dates = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        dates.push(dateStr);
        
        // 檢查職代衝突
        if (currentEmployee?.code) {
          const sameCodeEmployees = employees.filter(e => 
            e.code === currentEmployee.code && e.id !== employeeId
          );
          
          const conflicts = allLeaveRecords.filter(r => 
            sameCodeEmployees.some(e => e.id === r.employee_id) && r.date === dateStr
          );
          
          if (conflicts.length > 0) {
            const conflictNames = conflicts.map(c => {
              const emp = employees.find(e => e.id === c.employee_id);
              return emp?.name || '未知';
            }).join('、');
            warnings.push(`${dateStr}: 同職代 ${conflictNames} 已請假`);
          }
        }
        
        // 檢查部門人數限制
        const deptLeaves = allLeaveRecords.filter(r => {
          const emp = employees.find(e => e.id === r.employee_id);
          return emp?.department_id === currentEmployee?.department_id && r.date === dateStr;
        });
        
        if (deptLeaves.length >= 2) {
          warnings.push(`${dateStr}: 部門已有 ${deptLeaves.length} 人請假`);
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
      
      const records = dates.map(dateStr => ({
        employee_id: employeeId,
        date: dateStr,
        leave_type_id: leaveTypeId
      }));
      
      return base44.entities.LeaveRecord.bulkCreate(records);
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

      // 計算日期差（使用字串比較更可靠）
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

      // 計算日期差
      const current = new Date(currentDate + 'T00:00:00');
      const next = new Date(nextDate + 'T00:00:00');
      const diffDays = (next - current) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        rangeRecords.push(sameTypeRecords[i]);
      } else {
        break;
      }
    }

    // 如果是區間（超過1天），確認後刪除
    if (rangeRecords.length > 1) {
      const startDate = rangeRecords[0].date;
      const endDate = rangeRecords[rangeRecords.length - 1].date;
      const confirmed = window.confirm(
        `確定要取消 ${startDate} 至 ${endDate} 共 ${rangeRecords.length} 天的請假嗎？`
      );
      if (confirmed) {
        deleteRangeMutation.mutate(rangeRecords.map(r => r.id));
      }
    } else {
      // 單天直接刪除
      deleteLeaveMutation.mutate(record.id);
    }
  };

  const handleRangeLeave = async (employeeId, startDate, endDate, leaveTypeId) => {
    await rangeLeaveMutation.mutateAsync({ employeeId, startDate, endDate, leaveTypeId });
  };

  const handleRangeCancel = async (employeeId, startDate, endDate) => {
    await rangeCancelMutation.mutateAsync({ employeeId, startDate, endDate });
  };

  const handleReorderEmployees = async (departmentId, sourceIndex, destinationIndex) => {
    const deptEmployees = employees.filter(e => e.department_id === departmentId);
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
    <div className="min-h-screen bg-gray-50 p-6">
      <RangeLeaveDialog
        isOpen={rangeDialogOpen}
        onClose={() => {
          setRangeDialogOpen(false);
          setSelectedEmployee(null);
        }}
        onSubmit={handleRangeLeave}
        onCancel={handleRangeCancel}
        leaveTypes={leaveTypes}
        employeeId={selectedEmployee?.id}
        employeeName={selectedEmployee?.name}
        isSubmitting={rangeLeaveMutation.isPending || rangeCancelMutation.isPending}
      />
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">我的排休</h1>
          <CalendarHeader 
            currentDate={currentDate} 
            onDateChange={setCurrentDate}
          />
          </div>

          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 hover:bg-blue-100"
            onClick={() => setInstructionsOpen(!instructionsOpen)}
          >
            <h3 className="text-sm font-semibold text-blue-900">操作說明</h3>
            {instructionsOpen ? (
              <ChevronUp className="w-4 h-4 text-blue-900" />
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-900" />
            )}
          </Button>
          {instructionsOpen && (
            <div className="px-4 pb-4">
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <span className="font-medium">單擊格子</span>：選擇假別</li>
                <li>• <span className="font-medium">雙擊格子</span>：取消請假</li>
                <li>• <span className="font-medium">區間請假/取消</span>：點擊 <span className="inline-flex items-center px-1 bg-white rounded border border-blue-300">📅</span> 按鈕</li>
                <li>• <span className="font-medium">自動警示</span>：同職代衝突或部門超過2人請假時會提醒</li>
              </ul>
            </div>
          )}
          </div>

          <WeekCalendarTable
            currentDate={currentDate}
            currentEmployee={currentEmployee}
            currentDepartment={departments.find(d => d.id === currentEmployee?.department_id)}
            leaveRecords={leaveRecords}
            leaveTypes={leaveTypes}
            holidays={holidays}
            onUpdateLeave={handleUpdateLeave}
            onDeleteLeave={handleDeleteLeave}
            onDeleteRangeLeave={handleDeleteRangeLeave}
            onOpenRangeDialog={(emp) => {
              setSelectedEmployee(emp);
              setRangeDialogOpen(true);
            }}
          />

          <div className="mt-4">
            <LeaveLegend leaveTypes={leaveTypes} />
          </div>
          </div>
          </div>
          );
          }