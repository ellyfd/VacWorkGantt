import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Loader2, ChevronDown, ChevronUp, CalendarRange } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import WeekCalendarTable from '@/components/calendar/WeekCalendarTable';
import WarningDialog from '@/components/calendar/WarningDialog';

export default function LeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [warningDialog, setWarningDialog] = useState({ open: false, message: '', onConfirm: null });
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
    mutationFn: async ({ employeeId, date, leaveTypeId, skipWarning }) => {
      if (!skipWarning) {
        // 檢查職代衝突
        const currentEmployee = employees.find(e => e.id === employeeId);
        const warnings = [];
        
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
            warnings.push(`同職代同仁 ${conflictNames} 在 ${date} 已請假`);
          }
        }
        
        // 檢查部門人數限制
        const deptLeaves = allLeaveRecords.filter(r => {
          const emp = employees.find(e => e.id === r.employee_id);
          return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId)) && r.date === date;
        });
        
        if (deptLeaves.length >= 2) {
          warnings.push(`${date} 該部門已有 ${deptLeaves.length} 人請假`);
        }
        
        if (warnings.length > 0) {
          throw { needsConfirmation: true, warnings, originalData: { employeeId, date, leaveTypeId } };
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
    onError: (error) => {
      if (error.needsConfirmation) {
        setWarningDialog({
          open: true,
          message: error.warnings.join('\n'),
          onConfirm: () => {
            updateLeaveMutation.mutate({ ...error.originalData, skipWarning: true });
          }
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
    mutationFn: async ({ employeeId, startDate, endDate, leaveTypeId, skipWarning }) => {
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
        
        if (!skipWarning) {
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
            return emp?.department_ids?.some(deptId => currentEmployee?.department_ids?.includes(deptId)) && r.date === dateStr;
          });
          
          if (deptLeaves.length >= 2) {
            warnings.push(`${dateStr}: 部門已有 ${deptLeaves.length} 人請假`);
          }
        }
      }
      
      if (warnings.length > 0 && !skipWarning) {
        throw { needsConfirmation: true, warnings, originalData: { employeeId, startDate, endDate, leaveTypeId } };
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
    onError: (error) => {
      if (error.needsConfirmation) {
        setWarningDialog({
          open: true,
          message: error.warnings.join('\n'),
          onConfirm: () => {
            rangeLeaveMutation.mutate({ ...error.originalData, skipWarning: true });
          }
        });
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">我的排休</h1>

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

        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-4 hover:bg-gray-100"
              onClick={() => setLegendOpen(!legendOpen)}
            >
              <h3 className="text-sm font-semibold text-gray-700">操作說明與假別圖例</h3>
              {legendOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-700" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-700" />
              )}
            </Button>
            {legendOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-1">操作說明</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <span className="font-medium">選擇假別</span>：從下拉選單選擇要請的假別</li>
                    <li>• <span className="font-medium">單天請假</span>：選好假別後，單擊格子填充</li>
                    <li>• <span className="font-medium">區間請假</span>：選好假別後，點擊 📅 按鈕，在下方日曆選擇區間，按確定完成</li>
                    <li>• <span className="font-medium">雙擊格子</span>：取消請假（連續假期會一起取消）</li>
                    <li>• <span className="font-medium">自動警示</span>：同職代衝突或部門超過2人請假時會提醒</li>
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
            )}
        </div>

        <WarningDialog
          open={warningDialog.open}
          onOpenChange={(open) => setWarningDialog({ ...warningDialog, open })}
          message={warningDialog.message}
          onConfirm={warningDialog.onConfirm}
          onCancel={() => setWarningDialog({ open: false, message: '', onConfirm: null })}
        />
      </div>
    </div>
  );
}