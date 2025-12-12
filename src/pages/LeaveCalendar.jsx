import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import LeaveCalendarTable from '@/components/calendar/LeaveCalendarTable';
import LeaveLegend from '@/components/calendar/LeaveLegend';
import ProfileSetup from '@/components/ProfileSetup';
import RangeLeaveDialog from '@/components/calendar/RangeLeaveDialog';

export default function LeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    onSuccess: (user) => {
      if (!user.department_id || !user.employee_id) {
        setShowProfileSetup(true);
      }
    },
  });

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list('sort_order'),
  });

  const { data: employees = [], isLoading: loadingEmps } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('sort_order'),
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

  const rangeLeaveMutation = useMutation({
    mutationFn: async ({ employeeId, startDate, endDate, leaveTypeId }) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const records = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        records.push({
          employee_id: employeeId,
          date: dateStr,
          leave_type_id: leaveTypeId
        });
      }
      
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

  const handleRangeLeave = async (employeeId, startDate, endDate, leaveTypeId) => {
    await rangeLeaveMutation.mutateAsync({ employeeId, startDate, endDate, leaveTypeId });
  };

  const handleRangeCancel = async (employeeId, startDate, endDate) => {
    await rangeCancelMutation.mutateAsync({ employeeId, startDate, endDate });
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ProfileSetup 
        isOpen={showProfileSetup} 
        onComplete={() => setShowProfileSetup(false)} 
      />
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
        <CalendarHeader 
          currentDate={currentDate} 
          onDateChange={setCurrentDate}
          departments={departments}
          selectedDepartments={selectedDepartments}
          onDepartmentsChange={setSelectedDepartments}
        />

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">操作說明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <span className="font-medium">單擊格子</span>：選擇假別</li>
            <li>• <span className="font-medium">雙擊格子</span>：取消請假</li>
            <li>• <span className="font-medium">區間請假/取消</span>：點擊員工姓名旁的 <span className="inline-flex items-center px-1 bg-white rounded border border-blue-300">📅</span> 按鈕</li>
          </ul>
        </div>
        
        <LeaveLegend leaveTypes={leaveTypes} />
        
        <LeaveCalendarTable
          currentDate={currentDate}
          departments={selectedDepartments.length === 0 ? departments : departments.filter(d => selectedDepartments.includes(d.id))}
          employees={employees.filter(emp => emp.status === 'active')}
          leaveRecords={leaveRecords}
          leaveTypes={leaveTypes}
          holidays={holidays}
          onUpdateLeave={handleUpdateLeave}
          onDeleteLeave={handleDeleteLeave}
          onOpenRangeDialog={(emp) => {
            setSelectedEmployee(emp);
            setRangeDialogOpen(true);
          }}
        />

        {employees.length === 0 && (
          <div className="mt-8 text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">尚無員工資料</p>
            <p className="text-sm text-gray-400 mt-1">請先至員工管理新增員工</p>
          </div>
        )}
      </div>
    </div>
  );
}