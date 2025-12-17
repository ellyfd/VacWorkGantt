import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
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
import CalendarHeader from '@/components/calendar/CalendarHeader';
import LeaveCalendarTable from '@/components/calendar/LeaveCalendarTable';
import CalendarSettings from '@/components/calendar/CalendarSettings';
import RangeLeaveDialog from '@/components/calendar/RangeLeaveDialog';

export default function AllLeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined, employeeId: undefined });
  const queryClient = useQueryClient();

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
      
      const existing = leaveRecords.find(
        r => r.employee_id === employeeId && r.date === date
      );
      if (existing) {
        // 如果是同一個假別，不做任何操作
        if (existing.leave_type_id === leaveTypeId) {
          return existing;
        }
        // 不同假別則更新
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

      // 檢查是否為出差假別
      const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
      const isBusinessTrip = leaveType?.name === '出差';

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
      }

      if (warnings.length > 0) {
        const confirmed = window.confirm(
          `⚠️ 警告：\n${warnings.join('\n')}\n\n確定要繼續請假嗎？`
        );

        if (!confirmed) {
          throw new Error('取消請假');
        }
      }

      // 過濾掉已存在相同假別的日期
      const recordsToCreate = [];
      for (const dateStr of dates) {
        const existing = leaveRecords.find(
          r => r.employee_id === employeeId && r.date === dateStr && r.leave_type_id === leaveTypeId
        );
        if (!existing) {
          recordsToCreate.push({
            employee_id: employeeId,
            date: dateStr,
            leave_type_id: leaveTypeId
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

  const handleCellClickInRangeMode = (employeeId, date) => {
    if (!rangeMode) return;
    
    if (!dateRange.from) {
      // 第一次點擊：選擇員工和起始日期
      setDateRange({ from: date, to: undefined, employeeId });
    } else if (!dateRange.to && employeeId === dateRange.employeeId) {
      // 第二次點擊：同員工，選擇結束日期
      if (date >= dateRange.from) {
        setDateRange({ ...dateRange, to: date });
      } else {
        setDateRange({ from: date, to: dateRange.from, employeeId });
      }
    } else {
      // 重新選擇
      setDateRange({ from: date, to: undefined, employeeId });
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

  const isLoading = loadingDepts || loadingEmps || loadingTypes || loadingRecords || loadingHolidays;

  const filteredDepartments = selectedDepartments.length > 0
    ? departments.filter(d => selectedDepartments.includes(d.id))
    : departments;

  const currentEmployee = employees.find(emp => emp.user_emails?.includes(currentUser?.email));

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
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6 overflow-hidden">
      <div className="w-full">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">全部排休</h1>

        <div className="mb-4 space-y-3">
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Label className="font-semibold text-gray-700 whitespace-nowrap">篩選部門：</Label>
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap">
                {departments.map((dept) => (
                  <label key={dept.id} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded border border-gray-200 whitespace-nowrap flex-shrink-0">
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
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="text-xs text-gray-700">{dept.name}</span>
                  </label>
                ))}
              </div>
              <div className="sm:ml-auto">
                <CalendarHeader 
                  currentDate={currentDate} 
                  onDateChange={setCurrentDate}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Select 
                  value={selectedLeaveTypeId || ''} 
                  onValueChange={(value) => setSelectedLeaveTypeId(value || null)}
                  disabled={rangeMode}
                >
                  <SelectTrigger className="w-[160px] sm:w-[200px]">
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

              {rangeMode && (
                <p className="text-xs text-blue-600 break-words">
                  {!dateRange.from && "📍 請在下方日曆點擊任一員工的格子選擇起始日期"}
                  {dateRange.from && !dateRange.to && (() => {
                    const emp = employees.find(e => e.id === dateRange.employeeId);
                    return `📍 ${emp?.name} - 已選開始：${dateRange.from}，請繼續選擇結束日期`;
                  })()}
                  {dateRange.from && dateRange.to && (() => {
                    const emp = employees.find(e => e.id === dateRange.employeeId);
                    return `✓ ${emp?.name} - 已選區間：${dateRange.from} 至 ${dateRange.to}，點擊 ✓ 確認`;
                  })()}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 -mx-2 sm:mx-0">
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
          />
          </div>
        </div>
      </div>
    </div>
  );
}