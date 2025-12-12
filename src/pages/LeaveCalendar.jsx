import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import LeaveCalendarTable from '@/components/calendar/LeaveCalendarTable';
import LeaveLegend from '@/components/calendar/LeaveLegend';
import ProfileSetup from '@/components/ProfileSetup';

export default function LeaveCalendar() {
  const [selectedYears, setSelectedYears] = useState([2025]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
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
    queryFn: () => base44.entities.Employee.list('name'),
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
    queryKey: ['leaveRecords', selectedYears, selectedMonths],
    queryFn: async () => {
      if (selectedYears.length === 0) return [];
      
      const filters = [];
      selectedYears.forEach(year => {
        if (selectedMonths.length === 0) {
          filters.push({
            date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
          });
        } else {
          selectedMonths.forEach(month => {
            const monthStr = String(month + 1).padStart(2, '0');
            filters.push({
              date: { $gte: `${year}-${monthStr}-01`, $lte: `${year}-${monthStr}-31` }
            });
          });
        }
      });
      
      const allRecords = await Promise.all(
        filters.map(filter => base44.entities.LeaveRecord.filter(filter))
      );
      
      return allRecords.flat();
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

  const handleUpdateLeave = (employeeId, date, leaveTypeId) => {
    updateLeaveMutation.mutate({ employeeId, date, leaveTypeId });
  };

  const handleDeleteLeave = (recordId) => {
    deleteLeaveMutation.mutate(recordId);
  };

  const handleRangeLeave = async (employeeId, startDate, endDate, leaveTypeId) => {
    await rangeLeaveMutation.mutateAsync({ employeeId, startDate, endDate, leaveTypeId });
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
      <div className="max-w-full mx-auto">
        <CalendarHeader 
          selectedYears={selectedYears}
          onYearsChange={setSelectedYears}
          selectedMonths={selectedMonths}
          onMonthsChange={setSelectedMonths}
          departments={departments}
          selectedDepartments={selectedDepartments}
          onDepartmentsChange={setSelectedDepartments}
        />
        
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">操作說明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <span className="font-medium">單擊格子</span>：選擇假別</li>
            <li>• <span className="font-medium">雙擊格子</span>：取消請假</li>
            <li>• <span className="font-medium">區間請假</span>：點擊員工姓名旁的 <span className="inline-flex items-center px-1 bg-white rounded border border-blue-300">📅</span> 按鈕</li>
          </ul>
        </div>
        
        <LeaveLegend leaveTypes={leaveTypes} />
        
        <LeaveCalendarTable
          selectedYears={selectedYears}
          selectedMonths={selectedMonths}
          departments={selectedDepartments.length === 0 ? departments : departments.filter(d => selectedDepartments.includes(d.id))}
          employees={employees}
          leaveRecords={leaveRecords}
          leaveTypes={leaveTypes}
          holidays={holidays}
          onUpdateLeave={handleUpdateLeave}
          onDeleteLeave={handleDeleteLeave}
          onRangeLeave={handleRangeLeave}
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