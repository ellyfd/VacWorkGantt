import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import CalendarHeader from '@/components/calendar/CalendarHeader';

export default function ReportManagement() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const selectedYear = currentDate.getFullYear().toString();
  const selectedMonth = (currentDate.getMonth() + 1).toString();

  const { data: employees = [], isLoading: loadingEmps } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const depts = await base44.entities.Department.list('sort_order');
      return depts.filter(d => d.status !== 'hidden');
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
    queryKey: ['leaveRecords', selectedYear, selectedMonth],
    queryFn: async () => {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return base44.entities.LeaveRecord.filter({
        date: { $gte: startDate, $lte: endDate }
      });
    },
  });

  // Lookup maps (memoized)
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const leaveTypeMap = useMemo(() => new Map(leaveTypes.map(lt => [lt.id, lt])), [leaveTypes]);
  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  // 計算請假扣除時數
  const calculateLeaveHours = useCallback((leaveTypeName) => {
    if (leaveTypeName.includes('上午')) return 3;
    if (leaveTypeName.includes('下午')) return 4.5;
    return 7.5; // 全天休/病休/出差等
  };

  // 計算月度出席數據
  const calculateAttendanceData = (records, emps) => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    const daysInMonth = new Date(year, month, 0).getDate();

    // 計算工作日數（排除週末和假日）
    let workDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.some(h => h.date === dateStr);

      if (!isWeekend && !isHoliday) {
        workDays++;
      }
    }

    const activeEmployees = emps.filter(e => e.status === 'active');
    const totalEmployees = activeEmployees.length;
    const standardHoursPerDay = 7.5;
    const totalStandardHours = workDays * totalEmployees * standardHoursPerDay;

    // 計算總請假時數
    let totalLeaveHours = 0;
    records.forEach(record => {
      const leaveType = leaveTypes.find(lt => lt.id === record.leave_type_id);
      if (leaveType) {
        totalLeaveHours += calculateLeaveHours(leaveType.name);
      }
    });

    const actualWorkHours = totalStandardHours - totalLeaveHours;
    const attendanceRate = totalStandardHours > 0 ? (actualWorkHours / totalStandardHours * 100) : 0;
    const avgWorkHoursPerPerson = totalEmployees > 0 ? actualWorkHours / totalEmployees : 0;

    return {
      workDays,
      totalEmployees,
      totalStandardHours,
      totalLeaveHours,
      actualWorkHours,
      attendanceRate,
      avgWorkHoursPerPerson
    };
  };

  // 計算假別統計
  const calculateLeaveTypeStats = (records) => {
    const stats = {};
    records.forEach(record => {
      const leaveType = leaveTypes.find(lt => lt.id === record.leave_type_id);
      if (leaveType) {
        if (!stats[leaveType.name]) {
          stats[leaveType.name] = {
            count: 0,
            hours: 0,
            color: leaveType.color
          };
        }
        stats[leaveType.name].count++;
        stats[leaveType.name].hours += calculateLeaveHours(leaveType.name);
      }
    });
    return Object.entries(stats).map(([name, data]) => ({
      name,
      count: data.count,
      hours: data.hours,
      color: data.color
    })).sort((a, b) => b.count - a.count);
  };

  // 計算部門統計
  const calculateDepartmentStats = (records) => {
    const stats = {};
    departments.forEach(dept => {
      stats[dept.id] = {
        name: dept.name,
        employeeCount: 0,
        leaveCount: 0,
        leaveHours: 0
      };
    });

    employees.forEach(emp => {
      if (emp.status === 'active' && emp.department_ids) {
        emp.department_ids.forEach(deptId => {
          if (stats[deptId]) {
            stats[deptId].employeeCount++;
          }
        });
      }
    });

    records.forEach(record => {
      const emp = employees.find(e => e.id === record.employee_id);
      const leaveType = leaveTypes.find(lt => lt.id === record.leave_type_id);
      if (emp && emp.department_ids && leaveType) {
        const hours = calculateLeaveHours(leaveType.name);
        emp.department_ids.forEach(deptId => {
          if (stats[deptId]) {
            stats[deptId].leaveCount++;
            stats[deptId].leaveHours += hours;
          }
        });
      }
    });

    return Object.values(stats).map(dept => ({
      ...dept,
      avgLeavePerPerson: dept.employeeCount > 0 ? (dept.leaveCount / dept.employeeCount).toFixed(1) : 0,
      avgHoursPerPerson: dept.employeeCount > 0 ? (dept.leaveHours / dept.employeeCount).toFixed(1) : 0
    })).sort((a, b) => b.leaveCount - a.leaveCount);
  };

  // 計算員工排行（合併請假和出差）
  const calculateEmployeeRanking = (records) => {
    const stats = {};
    employees.forEach(emp => {
      if (emp.status === 'active') {
        stats[emp.id] = {
          name: emp.name,
          leaveHours: 0,
          tripHours: 0
        };
      }
    });

    records.forEach(record => {
      const leaveType = leaveTypes.find(lt => lt.id === record.leave_type_id);
      if (stats[record.employee_id] && leaveType) {
        const hours = calculateLeaveHours(leaveType.name);
        if (leaveType.name === '出差') {
          stats[record.employee_id].tripHours += hours;
        } else {
          stats[record.employee_id].leaveHours += hours;
        }
      }
    });

    return Object.values(stats)
      .filter(emp => emp.leaveHours > 0 || emp.tripHours > 0)
      .sort((a, b) => b.leaveHours - a.leaveHours)
      .slice(0, 10);
  };

  // 計算各部門每週人均工作時數
  const calculateWeeklyDeptWorkHours = () => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    const daysInMonth = new Date(year, month, 0).getDate();

    // 取得該月份的所有週
    const weeks = [];
    let currentWeek = { start: null, end: null, days: [] };

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (dayOfWeek === 1 || day === 1) { // 週一或月初第一天
        if (currentWeek.start) {
          weeks.push({...currentWeek});
        }
        currentWeek = { start: dateStr, end: dateStr, days: [dateStr] };
      } else {
        currentWeek.end = dateStr;
        currentWeek.days.push(dateStr);
      }

      if (day === daysInMonth) {
        weeks.push(currentWeek);
      }
    }

    // 使用篩選後的部門
    const deptsToCalculate = selectedDepartments.length > 0
      ? departments.filter(d => selectedDepartments.includes(d.id))
      : departments;

    // 計算每週每部門的人均工作時數
    const weeklyStats = weeks.map((week, weekIdx) => {
      const deptStats = {};

      deptsToCalculate.forEach(dept => {
        const deptEmployees = filteredEmployees.filter(e => 
          e.status === 'active' && e.department_ids?.includes(dept.id)
        );

        if (deptEmployees.length === 0) {
          deptStats[dept.name] = 0;
          return;
        }

        // 計算該週工作日數
        let workDays = 0;
        week.days.forEach(dateStr => {
          const date = new Date(dateStr + 'T00:00:00');
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = holidays.some(h => h.date === dateStr);
          if (!isWeekend && !isHoliday) {
            workDays++;
          }
        });

        const standardHours = workDays * deptEmployees.length * 7.5;

        // 計算該週該部門的請假時數
        let leaveHours = 0;
        filteredLeaveRecords.forEach(record => {
          if (week.days.includes(record.date)) {
            const emp = deptEmployees.find(e => e.id === record.employee_id);
            const leaveType = leaveTypes.find(lt => lt.id === record.leave_type_id);
            if (emp && leaveType) {
              leaveHours += calculateLeaveHours(leaveType.name);
            }
          }
        });

        const actualHours = standardHours - leaveHours;
        const avgHours = deptEmployees.length > 0 ? actualHours / deptEmployees.length : 0;
        deptStats[dept.name] = avgHours;
      });

      return {
        week: `W${weekIdx + 1}`,
        ...deptStats
      };
    });

    return weeklyStats;
  };

  const filteredEmployees = selectedDepartments.length > 0
    ? employees.filter(emp => emp.department_ids?.some(deptId => selectedDepartments.includes(deptId)))
    : employees;

  const filteredLeaveRecords = selectedDepartments.length > 0
    ? leaveRecords.filter(record => {
        const emp = employees.find(e => e.id === record.employee_id);
        return emp?.department_ids?.some(deptId => selectedDepartments.includes(deptId));
      })
    : leaveRecords;

  const isLoading = loadingEmps || loadingDepts || loadingTypes || loadingRecords || loadingHolidays;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const attendanceData = calculateAttendanceData(filteredLeaveRecords, filteredEmployees);
  const leaveTypeStats = calculateLeaveTypeStats(filteredLeaveRecords);
  const departmentStats = calculateDepartmentStats(filteredLeaveRecords);
  const employeeRanking = calculateEmployeeRanking(filteredLeaveRecords);
  const weeklyDeptWorkHours = calculateWeeklyDeptWorkHours();

  const filteredDepartments = selectedDepartments.length > 0
    ? departments.filter(d => selectedDepartments.includes(d.id))
    : departments;

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">報表管理</h1>
          </div>
          <CalendarHeader currentDate={currentDate} onDateChange={setCurrentDate} />
        </div>

        {/* 部門選擇 */}
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



        {/* 各部門每週人均工作時數 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                各部門每週人均工作時數
              </CardTitle>
              <span className="text-xs text-gray-400">（工作日數 × 7.5小時 - 請假時數）÷ 部門人數</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">工作日天數：<span className="text-lg font-semibold text-purple-600">{attendanceData.workDays}</span> 天（排除週末假日）</p>
          </CardHeader>
          <CardContent>
            {weeklyDeptWorkHours.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyDeptWorkHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => `${typeof value === 'number' ? value.toFixed(1) : value} 小時`}
                  />
                  <Legend />
                  {filteredDepartments.map((dept, idx) => (
                    <Bar key={dept.id} dataKey={dept.name} fill={COLORS[idx % COLORS.length]}>
                      <LabelList 
                        dataKey={dept.name} 
                        position="inside" 
                        fill="#fff" 
                        fontSize={11}
                        fontWeight="bold"
                        formatter={(value) => value > 0 ? value.toFixed(1) : ''}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">無數據</p>
            )}
          </CardContent>
        </Card>

        {/* 員工請假時數排行 TOP 10 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              員工請假時數排行 TOP 10
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employeeRanking.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">排名</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">員工姓名</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">請假時數</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">出差時數</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {employeeRanking.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-800">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-800">{emp.name}</td>
                        <td className="px-4 py-2 text-sm text-blue-600 font-semibold">{emp.leaveHours.toFixed(1)} 小時</td>
                        <td className="px-4 py-2 text-sm text-green-600 font-semibold">{emp.tripHours.toFixed(1)} 小時</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">本月無請假記錄</p>
            )}
          </CardContent>
        </Card>

        {/* 計算說明 */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">計算說明</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• 標準工作時間：每日 7.5 小時（9:00-18:00，扣除 1.5 小時午休）</p>
            <p>• 上午休：扣除 3 小時</p>
            <p>• 下午休：扣除 4.5 小時</p>
            <p>• 全天休/病休/出差：扣除 7.5 小時</p>
            <p>• 出席率 = 實際工作時數 ÷ 應工作時數 × 100%</p>
            <p>• 工作日計算已排除週末和假日</p>
          </div>
        </div>
      </div>
    </div>
  );
}