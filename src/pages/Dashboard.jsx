import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Loader2, Calendar as CalendarIcon, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
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
  const totalOnLeave = filteredLeaves.length;
  
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
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-sm font-semibold text-gray-700 whitespace-nowrap">篩選部門：</Label>
            {departments.map((dept) => (
              <label key={dept.id} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded border border-gray-200">
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
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              {format(new Date(selectedDate), 'MM月dd日 (EEEE)', { locale: zhTW })} 休假人員
            </h2>
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
                  <TableHead>假別</TableHead>
                  <TableHead>人數</TableHead>
                  <TableHead>人員</TableHead>
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
                    <TableCell>
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
                    <TableCell className="font-bold text-lg">{data.employees.length}</TableCell>
                    <TableCell className="text-gray-700">{data.employees.join('、')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}