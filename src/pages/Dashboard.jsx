import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Loader2, Calendar as CalendarIcon, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [isScanningWarnings, setIsScanningWarnings] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const depts = await base44.entities.Department.list('sort_order');
      return depts.filter(d => d.status !== 'hidden');
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('name'),
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => base44.entities.LeaveType.list(),
  });

  const { data: todayLeaves = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ['todayLeaves', selectedDate],
    queryFn: () => base44.entities.LeaveRecord.filter({ date: selectedDate }),
  });

  const { data: warningLeaves = [], isLoading: loadingWarnings } = useQuery({
    queryKey: ['warningLeaves', selectedDate],
    queryFn: () => base44.entities.LeaveRecord.filter({ 
      date: selectedDate,
      warning_type: { $exists: true, $ne: [] }
    }),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  const { data: allLeaveRecords = [] } = useQuery({
    queryKey: ['allLeaveRecords'],
    queryFn: () => base44.entities.LeaveRecord.list(),
    enabled: false, // 只在需要時手動觸發
  });

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? emp.name : '-';
  };

  const getDepartmentName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return '-';
    const depts = departments.filter(d => emp.department_ids?.includes(d.id));
    return depts.length > 0 ? depts.map(d => d.name).join(', ') : '-';
  };

  const getLeaveType = (typeId) => {
    return leaveTypes.find(lt => lt.id === typeId);
  };

  const filteredEmployees = selectedDepartments.length > 0
    ? employees.filter(emp => emp.department_ids?.some(deptId => selectedDepartments.includes(deptId)))
    : employees;

  const filteredLeaves = todayLeaves.filter(leave => {
    const emp = employees.find(e => e.id === leave.employee_id);
    if (!emp) return false;
    if (selectedDepartments.length === 0) return true;
    return emp.department_ids?.some(deptId => selectedDepartments.includes(deptId));
  });

  const leavesByDept = {};
  filteredLeaves.forEach(leave => {
    const emp = employees.find(e => e.id === leave.employee_id);
    if (emp && emp.department_ids) {
      emp.department_ids.forEach(deptId => {
        const dept = departments.find(d => d.id === deptId);
        const deptName = dept ? dept.name : '未分類';
        if (!leavesByDept[deptName]) {
          leavesByDept[deptName] = [];
        }
        if (!leavesByDept[deptName].some(l => l.id === leave.id)) {
          leavesByDept[deptName].push(leave);
        }
      });
    }
  });

  const activeEmployees = filteredEmployees.filter(emp => emp.status === 'active');
  
  // 計算實際請假人數（考慮上午休/下午休）
  const currentHour = new Date().getHours();
  const isAfternoon = currentHour >= 12;
  
  const totalOnLeave = filteredLeaves.filter(leave => {
    const leaveType = getLeaveType(leave.leave_type_id);
    if (!leaveType) return true;
    
    const leaveName = leaveType.name || '';
    const isAMLeave = leaveName.includes('上午');
    const isPMLeave = leaveName.includes('下午');
    
    // 全天休：無論何時都算請假
    if (!isAMLeave && !isPMLeave) return true;
    
    // 上午休：只在上午算請假
    if (isAMLeave && !isAfternoon) return true;
    
    // 下午休：只在下午算請假
    if (isPMLeave && isAfternoon) return true;
    
    return false;
  }).length;
  
  // 檢查是否為週末或假日
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const dayOfWeek = selectedDateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = holidays.some(h => h.date === selectedDate);
  const isNonWorkingDay = isWeekend || isHoliday;
  
  const totalEmployees = isNonWorkingDay ? 0 : activeEmployees.length;
  const actualAttendance = isNonWorkingDay ? 0 : (totalEmployees - totalOnLeave);
  const attendanceRate = totalEmployees > 0 ? ((actualAttendance / totalEmployees) * 100).toFixed(1) : 0;

  // 統計各假別人數
  const leaveByType = {};
  filteredLeaves.forEach(leave => {
    const leaveType = getLeaveType(leave.leave_type_id);
    const typeName = leaveType ? leaveType.short_name : '其他';
    leaveByType[typeName] = (leaveByType[typeName] || 0) + 1;
  });

  const holidayInfo = holidays.find(h => h.date === selectedDate);

  const handleCleanDuplicates = async () => {
    if (!window.confirm('確定要清理重複的請假記錄嗎？\n\n系統會檢查資料庫中同一人、同一天、同一假別的重複記錄，只保留最早的一筆。')) {
      return;
    }

    setIsCleaningDuplicates(true);
    try {
      // 先獲取所有請假記錄
      const records = await base44.entities.LeaveRecord.list();

      // 找出重複的記錄
      const recordMap = new Map();
      const duplicatesToDelete = [];

      records.forEach(record => {
        const key = `${record.employee_id}-${record.date}-${record.leave_type_id}`;
        if (recordMap.has(key)) {
          // 已存在相同的記錄，標記為要刪除
          duplicatesToDelete.push(record.id);
        } else {
          // 第一次出現，保留
          recordMap.set(key, record.id);
        }
      });

      if (duplicatesToDelete.length === 0) {
        alert('沒有發現重複的記錄');
      } else {
        // 批量刪除重複記錄
        await Promise.all(
          duplicatesToDelete.map(id => base44.entities.LeaveRecord.delete(id))
        );

        // 重新載入資料
        queryClient.invalidateQueries(['todayLeaves']);
        queryClient.invalidateQueries(['leaveRecords']);
        queryClient.invalidateQueries(['allLeaveRecords']);

        alert(`成功清理 ${duplicatesToDelete.length} 筆重複記錄`);
      }
    } catch (error) {
      alert('清理失敗：' + error.message);
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleScanWarnings = async () => {
    if (!window.confirm('確定要重新掃描所有請假記錄的警示資訊嗎？\n\n系統會檢查所有現有的請假記錄，為符合條件的記錄補上警示資訊（職代衝突、部門超標）。\n\n這可能需要一些時間。')) {
      return;
    }

    setIsScanningWarnings(true);
    try {
      // 獲取所有資料
      const allRecords = await base44.entities.LeaveRecord.list();
      const allEmployees = await base44.entities.Employee.list();
      const allLeaveTypes = await base44.entities.LeaveType.list();

      let updatedCount = 0;

      // 為每筆記錄檢查警示
      for (const record of allRecords) {
        const currentEmployee = allEmployees.find(e => e.id === record.employee_id);
        if (!currentEmployee) continue;

        const warningTypes = [];
        const warningDetails = {};

        // 檢查職代衝突（排除出差）
        const currentLeaveType = allLeaveTypes.find(lt => lt.id === record.leave_type_id);
        const isBusinessTrip = currentLeaveType?.name === '出差';

        if (!isBusinessTrip && (currentEmployee.deputy_1 || currentEmployee.deputy_2)) {
          const deputies = [currentEmployee.deputy_1, currentEmployee.deputy_2].filter(Boolean);
          const deputyConflicts = allRecords.filter(r => {
            const rLeaveType = allLeaveTypes.find(lt => lt.id === r.leave_type_id);
            return deputies.includes(r.employee_id) && r.date === record.date && r.id !== record.id && rLeaveType?.name !== '出差';
          });

          if (deputyConflicts.length > 0) {
            warningTypes.push('deputy_conflict');
            warningDetails.deputy_conflicts = deputyConflicts.map(c => {
              const emp = allEmployees.find(e => e.id === c.employee_id);
              const lt = allLeaveTypes.find(l => l.id === c.leave_type_id);
              return {
                employee_id: c.employee_id,
                employee_name: emp?.name || '未知',
                leave_type: lt?.name || '未知'
              };
            });
          }
        }

        // 檢查部門超標（排除出差）
        if (!isBusinessTrip) {
        const deptLeaves = allRecords.filter(r => {
          if (r.employee_id === record.employee_id || r.id === record.id) return false;
          const emp = allEmployees.find(e => e.id === r.employee_id);
          const rLeaveType = allLeaveTypes.find(lt => lt.id === r.leave_type_id);
          return emp?.department_ids?.some(deptId => currentEmployee.department_ids?.includes(deptId)) && r.date === record.date && rLeaveType?.name !== '出差';
        });

        const deptTotalMembers = allEmployees.filter(e => 
          e.status === 'active' && 
          e.department_ids?.some(deptId => currentEmployee.department_ids?.includes(deptId))
        ).length;

        const deptLimit = Math.floor(deptTotalMembers / 3);

        if (deptLeaves.length >= deptLimit && deptTotalMembers > 0) {
          warningTypes.push('department_over_limit');
          warningDetails.department_info = {
            total_members: deptTotalMembers,
            leave_count: deptLeaves.length + 1,
            limit: deptLimit,
            percentage: Math.round((deptLeaves.length + 1) / deptTotalMembers * 100)
          };
        }
        }

        // 如果有警示且記錄尚未包含警示資訊，則更新
        if (warningTypes.length > 0 && (!record.warning_type || record.warning_type.length === 0)) {
          await base44.entities.LeaveRecord.update(record.id, {
            warning_type: warningTypes,
            warning_details: warningDetails
          });
          updatedCount++;
        }
      }

      // 重新載入資料
      queryClient.invalidateQueries(['todayLeaves']);
      queryClient.invalidateQueries(['warningLeaves']);
      queryClient.invalidateQueries(['leaveRecords']);
      queryClient.invalidateQueries(['allLeaveRecords']);

      alert(`掃描完成！共更新 ${updatedCount} 筆記錄的警示資訊。`);
    } catch (error) {
      alert('掃描失敗：' + error.message);
    } finally {
      setIsScanningWarnings(false);
    }
  };

  const isLoading = loadingUser || loadingLeaves;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">儀表板</h1>
          <div className="flex items-center gap-3">
            <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(new Date(selectedDate), 'yyyy年MM月dd日 (E)', { locale: zhTW }) : "選擇日期"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(format(date, 'yyyy-MM-dd'));
                  }
                }}
                locale={zhTW}
                weekStartsOn={0}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          </div>
        </div>

        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
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
        </div>

        {isHoliday && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">
              🎉 {holidayInfo.name} ({holidayInfo.type === 'national' ? '國定假日' : '公司特別假'})
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">應到人數</div>
              <div className="text-2xl font-bold text-gray-800">{totalEmployees}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">實到人數</div>
              <div className="text-2xl font-bold text-green-600">{actualAttendance}</div>
              <div className="text-xs text-gray-400 mt-0.5">出勤率 {attendanceRate}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">請假人數</div>
              <div className="text-2xl font-bold text-orange-600">{totalOnLeave}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">未到人數</div>
              <div className="text-2xl font-bold text-red-600">{totalOnLeave}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {Object.entries(leaveByType).map(([type, count], idx) => (
                  <span key={type}>
                    {type}:{count}
                    {idx < Object.entries(leaveByType).length - 1 && ' | '}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">
              休假人員
            </h2>
            {currentUser?.role === 'admin' && (
              <Button
                onClick={handleCleanDuplicates}
                disabled={isCleaningDuplicates || isScanningWarnings}
                variant="outline"
                size="sm"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                {isCleaningDuplicates ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    清理中...
                  </>
                ) : (
                  '清理重複記錄'
                )}
              </Button>
            )}
          </div>

          {totalOnLeave === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>今日無休假人員</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="py-2">假別</TableHead>
                  <TableHead className="py-2">人數</TableHead>
                  <TableHead className="py-2">人員</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(
                  filteredLeaves.reduce((acc, leave) => {
                    const leaveType = getLeaveType(leave.leave_type_id);
                    const typeId = leave.leave_type_id;
                    if (!acc[typeId]) {
                      acc[typeId] = {
                        leaveType,
                        employees: []
                      };
                    }
                    const emp = employees.find(e => e.id === leave.employee_id);
                    if (emp) {
                      acc[typeId].employees.push(emp.name);
                    }
                    return acc;
                  }, {})
                ).map(([typeId, data]) => (
                  <TableRow key={typeId}>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        {data.leaveType && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: data.leaveType.color }}
                          />
                        )}
                        <span className="font-medium">{data.leaveType ? data.leaveType.name : '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-lg py-2">{data.employees.length}</TableCell>
                    <TableCell className="py-2">
                      <div className="grid grid-cols-3 gap-x-2 gap-y-1 sm:flex sm:flex-wrap">
                        {data.employees.map((name, idx) => (
                          <span key={idx} className="text-gray-700 text-sm">
                            {name}{idx < data.employees.length - 1 && <span className="hidden sm:inline">、</span>}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {(() => {
          // 即時檢查是否真的有警示，並按部門篩選
          const actualWarnings = warningLeaves.filter(r => {
            const lt = getLeaveType(r.leave_type_id);
            if (lt?.name === '出差') return false;

            const emp = employees.find(e => e.id === r.employee_id);
            if (!emp) return false;

            // 部門篩選
            if (selectedDepartments.length > 0) {
              if (!emp.department_ids?.some(deptId => selectedDepartments.includes(deptId))) {
                return false;
              }
            }

            // 檢查職代衝突
            let hasDeputyConflict = false;
            if (emp.deputy_1 || emp.deputy_2) {
              const deputies = [emp.deputy_1, emp.deputy_2].filter(Boolean);
              const conflicts = todayLeaves.filter(lr => {
                const lrType = getLeaveType(lr.leave_type_id);
                return deputies.includes(lr.employee_id) && lr.date === r.date && lrType?.name !== '出差';
              });
              hasDeputyConflict = conflicts.length > 0;
            }

            // 檢查部門超標
            let hasDeptOverLimit = false;
            const deptLeaves = todayLeaves.filter(lr => {
              if (lr.employee_id === r.employee_id) return false;
              const e = employees.find(e => e.id === lr.employee_id);
              const lrType = getLeaveType(lr.leave_type_id);
              return e?.department_ids?.some(deptId => emp?.department_ids?.includes(deptId)) && lr.date === r.date && lrType?.name !== '出差';
            });
            const deptTotalMembers = employees.filter(e => 
              e.status === 'active' && 
              e.department_ids?.some(deptId => emp?.department_ids?.includes(deptId))
            ).length;
            const deptLimit = Math.floor(deptTotalMembers / 3);
            hasDeptOverLimit = deptLeaves.length >= deptLimit;

            return hasDeputyConflict || hasDeptOverLimit;
          });

          return actualWarnings.length > 0;
        })() && (
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden mt-8">
            <div className="p-6 border-b border-orange-200 bg-orange-50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                異常請假
              </h2>
              {currentUser?.role === 'admin' && (
                <Button
                  onClick={handleScanWarnings}
                  disabled={isCleaningDuplicates || isScanningWarnings}
                  variant="outline"
                  size="sm"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 bg-white"
                >
                  {isScanningWarnings ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      掃描中...
                    </>
                  ) : (
                    '掃描警示資訊'
                  )}
                </Button>
              )}
            </div>

            {/* 桌面版 - 表格 */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="py-2">員工姓名</TableHead>
                    <TableHead className="py-2">請假日期</TableHead>
                    <TableHead className="py-2">假別</TableHead>
                    <TableHead className="py-2">警示類型</TableHead>
                    <TableHead className="py-2">警示細節</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warningLeaves.filter(r => {
                    const lt = getLeaveType(r.leave_type_id);
                    if (lt?.name === '出差') return false;

                    const emp = employees.find(e => e.id === r.employee_id);
                    if (!emp) return false;

                    // 部門篩選
                    if (selectedDepartments.length > 0) {
                      if (!emp.department_ids?.some(deptId => selectedDepartments.includes(deptId))) {
                        return false;
                      }
                    }

                    // 即時檢查是否真的有警示
                    let hasDeputyConflict = false;
                    if (emp.deputy_1 || emp.deputy_2) {
                      const deputies = [emp.deputy_1, emp.deputy_2].filter(Boolean);
                      const conflicts = todayLeaves.filter(lr => {
                        const lrType = getLeaveType(lr.leave_type_id);
                        return deputies.includes(lr.employee_id) && lr.date === r.date && lrType?.name !== '出差';
                      });
                      hasDeputyConflict = conflicts.length > 0;
                    }

                    let hasDeptOverLimit = false;
                    const deptLeaves = todayLeaves.filter(lr => {
                      if (lr.employee_id === r.employee_id) return false;
                      const e = employees.find(e => e.id === lr.employee_id);
                      const lrType = getLeaveType(lr.leave_type_id);
                      return e?.department_ids?.some(deptId => emp?.department_ids?.includes(deptId)) && lr.date === r.date && lrType?.name !== '出差';
                    });
                    const deptTotalMembers = employees.filter(e => 
                      e.status === 'active' && 
                      e.department_ids?.some(deptId => emp?.department_ids?.includes(deptId))
                    ).length;
                    const deptLimit = Math.floor(deptTotalMembers / 3);
                    hasDeptOverLimit = deptLeaves.length >= deptLimit;

                    return hasDeputyConflict || hasDeptOverLimit;
                  }).map((record) => {
                    const employee = employees.find(e => e.id === record.employee_id);
                    const leaveType = getLeaveType(record.leave_type_id);

                    const warningTypes = record.warning_type || [];
                    const warningDetails = record.warning_details || {};

                    // 即時查詢當前職代資訊
                    const getCurrentDeputies = () => {
                      if (!employee) return [];
                      const deputies = [employee.deputy_1, employee.deputy_2].filter(Boolean);
                      const deputyConflicts = todayLeaves.filter(lr => {
                        const lrType = getLeaveType(lr.leave_type_id);
                        return deputies.includes(lr.employee_id) && lr.date === record.date && lrType?.name !== '出差';
                      });
                      return deputyConflicts.map(dc => {
                        const dep = employees.find(e => e.id === dc.employee_id);
                        const lt = getLeaveType(dc.leave_type_id);
                        return { name: dep?.name || '未知', leaveType: lt?.name || '未知' };
                      });
                    };

                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium py-2">{employee?.name || '-'}</TableCell>
                        <TableCell className="py-2">{record.date}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            {leaveType && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: leaveType.color }}
                              />
                            )}
                            <span>{leaveType?.name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col gap-1">
                            {warningTypes.map((type, idx) => (
                              <span 
                                key={idx}
                                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  type === 'deputy_conflict' 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {type === 'deputy_conflict' ? '職代衝突' : '部門請假超標'}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-sm space-y-1">
                            {warningTypes.includes('deputy_conflict') && (() => {
                              const currentDeputies = getCurrentDeputies();
                              return currentDeputies.length > 0 && (
                                <div>
                                  <span className="font-medium">職代：</span>
                                  {currentDeputies.map((c, idx) => (
                                    <span key={idx}>
                                      {c.name} ({c.leaveType})
                                      {idx < currentDeputies.length - 1 && '、'}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                            {warningTypes.includes('department_over_limit') && warningDetails.department_info && (
                              <div>
                                <span className="font-medium">部門請假比例：</span>
                                {warningDetails.department_info.percentage}% 
                                ({warningDetails.department_info.leave_count}/{warningDetails.department_info.total_members}人)
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* 手機版 - 卡片式 */}
            <div className="md:hidden divide-y divide-gray-200">
              {warningLeaves.filter(r => {
                const lt = getLeaveType(r.leave_type_id);
                if (lt?.name === '出差') return false;

                const emp = employees.find(e => e.id === r.employee_id);
                if (!emp) return false;

                // 部門篩選
                if (selectedDepartments.length > 0) {
                  if (!emp.department_ids?.some(deptId => selectedDepartments.includes(deptId))) {
                    return false;
                  }
                }

                // 即時檢查是否真的有警示
                let hasDeputyConflict = false;
                if (emp.deputy_1 || emp.deputy_2) {
                  const deputies = [emp.deputy_1, emp.deputy_2].filter(Boolean);
                  const conflicts = todayLeaves.filter(lr => {
                    const lrType = getLeaveType(lr.leave_type_id);
                    return deputies.includes(lr.employee_id) && lr.date === r.date && lrType?.name !== '出差';
                  });
                  hasDeputyConflict = conflicts.length > 0;
                }

                let hasDeptOverLimit = false;
                const deptLeaves = todayLeaves.filter(lr => {
                  if (lr.employee_id === r.employee_id) return false;
                  const e = employees.find(e => e.id === lr.employee_id);
                  const lrType = getLeaveType(lr.leave_type_id);
                  return e?.department_ids?.some(deptId => emp?.department_ids?.includes(deptId)) && lr.date === r.date && lrType?.name !== '出差';
                });
                const deptTotalMembers = employees.filter(e => 
                  e.status === 'active' && 
                  e.department_ids?.some(deptId => emp?.department_ids?.includes(deptId))
                ).length;
                const deptLimit = Math.floor(deptTotalMembers / 3);
                hasDeptOverLimit = deptLeaves.length >= deptLimit;

                return hasDeputyConflict || hasDeptOverLimit;
              }).map((record) => {
                const employee = employees.find(e => e.id === record.employee_id);
                const leaveType = getLeaveType(record.leave_type_id);

                const warningTypes = record.warning_type || [];
                const warningDetails = record.warning_details || {};

                // 即時查詢當前職代資訊
                const getCurrentDeputies = () => {
                  if (!employee) return [];
                  const deputies = [employee.deputy_1, employee.deputy_2].filter(Boolean);
                  const deputyConflicts = todayLeaves.filter(lr => {
                    const lrType = getLeaveType(lr.leave_type_id);
                    return deputies.includes(lr.employee_id) && lr.date === record.date && lrType?.name !== '出差';
                  });
                  return deputyConflicts.map(dc => {
                    const dep = employees.find(e => e.id === dc.employee_id);
                    const lt = getLeaveType(dc.leave_type_id);
                    return { name: dep?.name || '未知', leaveType: lt?.name || '未知' };
                  });
                };

                return (
                  <div key={record.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-gray-800">{employee?.name || '-'}</div>
                        <div className="flex items-center gap-1">
                          {leaveType && (
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: leaveType.color }}
                            />
                          )}
                          <span className="text-sm text-gray-600">{leaveType?.name || '-'}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{record.date}</div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {warningTypes.map((type, idx) => (
                        <span 
                          key={idx}
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            type === 'deputy_conflict' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {type === 'deputy_conflict' ? '職代衝突' : '部門請假超標'}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(() => {
          const actualWarnings = warningLeaves.filter(r => {
            const lt = getLeaveType(r.leave_type_id);
            if (lt?.name === '出差') return false;

            const emp = employees.find(e => e.id === r.employee_id);
            if (!emp) return false;

            let hasDeputyConflict = false;
            if (emp.deputy_1 || emp.deputy_2) {
              const deputies = [emp.deputy_1, emp.deputy_2].filter(Boolean);
              const conflicts = todayLeaves.filter(lr => {
                const lrType = getLeaveType(lr.leave_type_id);
                return deputies.includes(lr.employee_id) && lr.date === r.date && lrType?.name !== '出差';
              });
              hasDeputyConflict = conflicts.length > 0;
            }

            let hasDeptOverLimit = false;
            const deptLeaves = todayLeaves.filter(lr => {
              if (lr.employee_id === r.employee_id) return false;
              const e = employees.find(e => e.id === lr.employee_id);
              const lrType = getLeaveType(lr.leave_type_id);
              return e?.department_ids?.some(deptId => emp?.department_ids?.includes(deptId)) && lr.date === r.date && lrType?.name !== '出差';
            });
            const deptTotalMembers = employees.filter(e => 
              e.status === 'active' && 
              e.department_ids?.some(deptId => emp?.department_ids?.includes(deptId))
            ).length;
            const deptLimit = Math.floor(deptTotalMembers / 3);
            hasDeptOverLimit = deptLeaves.length >= deptLimit;

            return hasDeputyConflict || hasDeptOverLimit;
          });

          return actualWarnings.length > 0;
        })() && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">說明</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="font-medium text-orange-600 flex-shrink-0">⚠️ 職代衝突：</span>
                <span>員工與其職務代理人在同一天請假（出差除外），可能影響業務運作</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-red-600 flex-shrink-0">⚠️ 部門請假超標：</span>
                <span>該部門當天請假人數達到或超過部門總人數的 1/3（出差除外），可能影響部門運作</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-500 flex-shrink-0">💡 提示：</span>
                <span>「出差」不會觸發上述警示，因為出差員工仍可協助處理業務</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}