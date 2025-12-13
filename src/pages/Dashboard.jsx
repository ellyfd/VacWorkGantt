import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Loader2, Calendar, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LeaveStatistics from '@/components/dashboard/LeaveStatistics';

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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

  const leavesByDept = {};
  todayLeaves.forEach(leave => {
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

  const activeEmployees = employees.filter(emp => emp.status === 'active');
  const totalOnLeave = todayLeaves.length;
  const totalEmployees = activeEmployees.length;
  const actualAttendance = totalEmployees - totalOnLeave;
  const attendanceRate = totalEmployees > 0 ? ((actualAttendance / totalEmployees) * 100).toFixed(1) : 0;

  // 統計各假別人數
  const leaveByType = {};
  todayLeaves.forEach(leave => {
    const leaveType = getLeaveType(leave.leave_type_id);
    const typeName = leaveType ? leaveType.short_name : '其他';
    leaveByType[typeName] = (leaveByType[typeName] || 0) + 1;
  });

  const isHoliday = holidays.some(h => h.date === selectedDate);
  const holidayInfo = holidays.find(h => h.date === selectedDate);

  const isLoading = loadingUser || loadingLeaves;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 7 + i);
    return format(date, 'yyyy-MM-dd');
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">首頁儀表板</h1>
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dates.map((date) => (
                <SelectItem key={date} value={date}>
                  {format(new Date(date), 'MM月dd日 (E)', { locale: zhTW })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>今日無休假人員</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>部門</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>職代</TableHead>
                  <TableHead>假別</TableHead>
                  <TableHead>備註</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayLeaves.map((leave) => {
                  const emp = employees.find(e => e.id === leave.employee_id);
                  const leaveType = getLeaveType(leave.leave_type_id);
                  return (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">
                        {getDepartmentName(leave.employee_id)}
                      </TableCell>
                      <TableCell>
                        {emp ? emp.name : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {emp?.deputy_1 || emp?.deputy_2 ? (
                          <>
                            {emp.deputy_1 && <div>1. {employees.find(e => e.id === emp.deputy_1)?.name || '-'}</div>}
                            {emp.deputy_2 && <div>2. {employees.find(e => e.id === emp.deputy_2)?.name || '-'}</div>}
                          </>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {leaveType && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: leaveType.color }}
                            />
                          )}
                          <span>{leaveType ? leaveType.name : '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {leave.note || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <LeaveStatistics 
          departments={departments}
          employees={employees}
          leaveTypes={leaveTypes}
        />
      </div>
    </div>
  );
}