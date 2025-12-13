import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Loader2, CalendarRange } from 'lucide-react';
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CalendarHeader from '@/components/calendar/CalendarHeader';
import LeaveCalendarTable from '@/components/calendar/LeaveCalendarTable';
import CalendarSettings from '@/components/calendar/CalendarSettings';
import RangeLeaveDialog from '@/components/calendar/RangeLeaveDialog';

export default function AllLeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const queryClient = useQueryClient();

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
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;
        return base44.entities.LeaveRecord.filter({
          date: { $gte: startDate, $lte: endDate }
        });
      }
    },
  });

  const updateLeaveMutation = useMutation({
    mutationFn: async ({ employeeId, date, leaveTypeId }) => {
      const currentEmployee = employees.find(e => e.id === employeeId);
      if (currentEmployee?.code) {
        const sameCodeEmployees = employees.filter(e => 
          e.code === currentEmployee.code && e.id !== employeeId
        );
        
        const conflicts = leaveRecords.filter(r => 
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
      
      const deptLeaves = leaveRecords.filter(r => {
        const emp = employees.find(e => e.id === r.employee_id);
        return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId)) && r.date === date;
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
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (recordId) => base44.entities.LeaveRecord.delete(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
    },
  });

  const deleteRangeMutation = useMutation({
    mutationFn: async (recordIds) => {
      await Promise.all(recordIds.map(id => base44.entities.LeaveRecord.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveRecords']);
    },
  });

  const rangeLeaveMutation = useMutation({
    mutationFn: async ({ employeeId, startDate, endDate, leaveTypeId }) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const currentEmployee = employees.find(e => e.id === employeeId);
      
      const warnings = [];
      const dates = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        dates.push(dateStr);
        
        if (currentEmployee?.code) {
          const sameCodeEmployees = employees.filter(e => 
            e.code === currentEmployee.code && e.id !== employeeId
          );
          
          const conflicts = leaveRecords.filter(r => 
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
        
        const deptLeaves = leaveRecords.filter(r => {
          const emp = employees.find(e => e.id === r.employee_id);
          return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId)) && r.date === dateStr;
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
      const confirmed = window.confirm(
        `確定要取消 ${startDate} 至 ${endDate} 共 ${rangeRecords.length} 天的請假嗎？`
      );
      if (confirmed) {
        deleteRangeMutation.mutate(rangeRecords.map(r => r.id));
      }
    } else {
      deleteLeaveMutation.mutate(record.id);
    }
  };

  const handleRangeLeave = async (employeeId, startDate, endDate, leaveTypeId) => {
    await rangeLeaveMutation.mutateAsync({ employeeId, startDate, endDate, leaveTypeId });
    setRangeDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleRangeCancel = async (employeeId, startDate, endDate) => {
    await rangeCancelMutation.mutateAsync({ employeeId, startDate, endDate });
    setRangeDialogOpen(false);
    setSelectedEmployee(null);
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

  const isLoading = loadingDepts || loadingEmps || loadingTypes || loadingRecords || loadingHolidays;

  const filteredDepartments = selectedDepartments.length > 0
    ? departments.filter(d => selectedDepartments.includes(d.id))
    : departments;

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">全部排休</h1>
          <div className="flex gap-3">
            <CalendarSettings
              departments={departments}
              selectedDepartments={selectedDepartments}
              onDepartmentsChange={setSelectedDepartments}
            />
            <CalendarHeader 
              currentDate={currentDate} 
              onDateChange={setCurrentDate}
            />
          </div>
        </div>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <span className="font-semibold">提示：</span>點擊員工姓名可進行區間請假/取消
          </p>
        </div>

        <div className="space-y-4">
          <LeaveCalendarTable
            currentDate={currentDate}
            departments={filteredDepartments}
            employees={employees}
            leaveRecords={leaveRecords}
            leaveTypes={leaveTypes}
            holidays={holidays}
            onUpdateLeave={handleUpdateLeave}
            onDeleteLeave={handleDeleteLeave}
            onDeleteRangeLeave={handleDeleteRangeLeave}
            onReorderEmployees={handleReorderEmployees}
            onOpenRangeDialog={(emp) => {
              setSelectedEmployee(emp);
              setRangeDialogOpen(true);
            }}
          />
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">假別說明</h3>
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
    </div>
  );
}