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
import ProfileSetup from '@/components/ProfileSetup';

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    onSuccess: (user) => {
      if (!user.department_id || !user.employee_id) {
        setShowProfileSetup(true);
      }
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list('sort_order'),
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
    return emp ? `${emp.name}${emp.code ? ` (${emp.code})` : ''}` : '-';
  };

  const getDepartmentName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return '-';
    const dept = departments.find(d => d.id === emp.department_id);
    return dept ? dept.name : '-';
  };

  const getLeaveType = (typeId) => {
    return leaveTypes.find(lt => lt.id === typeId);
  };

  const leavesByDept = {};
  todayLeaves.forEach(leave => {
    const emp = employees.find(e => e.id === leave.employee_id);
    if (emp) {
      const dept = departments.find(d => d.id === emp.department_id);
      const deptName = dept ? dept.name : '未分類';
      if (!leavesByDept[deptName]) {
        leavesByDept[deptName] = [];
      }
      leavesByDept[deptName].push(leave);
    }
  });

  const totalOnLeave = todayLeaves.length;
  const totalEmployees = employees.length;
  const attendanceRate = totalEmployees > 0 ? ((totalEmployees - totalOnLeave) / totalEmployees * 100).toFixed(1) : 0;

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
      <ProfileSetup 
        isOpen={showProfileSetup} 
        onComplete={() => setShowProfileSetup(false)} 
      />
      
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">今日休假人數</CardTitle>
              <Calendar className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{totalOnLeave}</div>
              <p className="text-xs text-gray-500 mt-1">人</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">總員工數</CardTitle>
              <Users className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-800">{totalEmployees}</div>
              <p className="text-xs text-gray-500 mt-1">人</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">出勤率</CardTitle>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{attendanceRate}%</div>
              <p className="text-xs text-gray-500 mt-1">今日在崗</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {format(new Date(selectedDate), 'MM月dd日 (EEEE)', { locale: zhTW })} 休假人員
          </h2>

          {totalOnLeave === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>今日無休假人員</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(leavesByDept).map(([deptName, leaves]) => (
                <div key={deptName}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded" />
                    {deptName}
                    <span className="text-xs font-normal text-gray-500">({leaves.length}人)</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {leaves.map((leave) => {
                      const leaveType = getLeaveType(leave.leave_type_id);
                      return (
                        <div
                          key={leave.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          {leaveType && (
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: leaveType.color }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {getEmployeeName(leave.employee_id)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {leaveType ? leaveType.name : '-'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}