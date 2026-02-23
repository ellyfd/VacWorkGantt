import React, { useState, useMemo } from 'react';
import { endOfMonth, format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, BarChart3 } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function LeaveStatistics({ departments: allDepartments, employees, leaveTypes }) {
  const departments = allDepartments.filter(d => d.status !== 'hidden');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const [period, setPeriod] = useState('month');
  const [year, setYear] = useState(currentYear.toString());
  const [month, setMonth] = useState(currentMonth.toString());
  const [quarter, setQuarter] = useState(currentQuarter.toString());

  const { data: allLeaveRecords = [], isLoading } = useQuery({
    queryKey: ['allLeaveRecords', year],
    queryFn: async () => {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      return base44.entities.LeaveRecord.filter({
        date: { $gte: startDate, $lte: endDate }
      });
    },
  });

  const filteredRecords = useMemo(() => {
    let records = allLeaveRecords;
    
    if (period === 'month') {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      records = allLeaveRecords.filter(r => r.date >= startDate && r.date <= endDate);
    } else if (period === 'quarter') {
      const startMonth = (parseInt(quarter) - 1) * 3 + 1;
      const endMonth = parseInt(quarter) * 3;
      const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(endMonth).padStart(2, '0')}-31`;
      records = allLeaveRecords.filter(r => r.date >= startDate && r.date <= endDate);
    }
    
    return records;
  }, [allLeaveRecords, period, year, month, quarter]);

  const departmentStats = useMemo(() => {
    const stats = {};
    departments.forEach(dept => {
      stats[dept.id] = { name: dept.name, count: 0 };
    });
    
    filteredRecords.forEach(record => {
      const emp = employees.find(e => e.id === record.employee_id);
      if (emp && stats[emp.department_id]) {
        stats[emp.department_id].count++;
      }
    });
    
    return Object.values(stats).filter(s => s.count > 0);
  }, [filteredRecords, departments, employees]);

  const leaveTypeStats = useMemo(() => {
    const stats = {};
    leaveTypes.forEach(type => {
      stats[type.id] = { name: type.name, count: 0, color: type.color };
    });
    
    filteredRecords.forEach(record => {
      if (stats[record.leave_type_id]) {
        stats[record.leave_type_id].count++;
      }
    });
    
    return Object.values(stats).filter(s => s.count > 0);
  }, [filteredRecords, leaveTypes]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const getPeriodLabel = () => {
    if (period === 'month') return `${year}年${month}月`;
    if (period === 'quarter') return `${year}年第${quarter}季`;
    return `${year}年`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">請假統計報表</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">按月</SelectItem>
                <SelectItem value="quarter">按季</SelectItem>
                <SelectItem value="year">按年</SelectItem>
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}年</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {period === 'month' && (
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={m.toString()}>{m}月</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {period === 'quarter' && (
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map(q => (
                    <SelectItem key={q} value={q.toString()}>第{q}季</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            統計期間：<span className="font-semibold text-gray-800">{getPeriodLabel()}</span>
            <span className="ml-4">總請假人次：<span className="font-semibold text-blue-600">{filteredRecords.length}</span></span>
          </p>
        </div>

        <Tabs defaultValue="department" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="department">按部門統計</TabsTrigger>
            <TabsTrigger value="leavetype">按假別統計</TabsTrigger>
          </TabsList>

          <TabsContent value="department" className="mt-6">
            {departmentStats.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>本期間無請假記錄</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">部門請假人次 - 長條圖</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="請假人次" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">部門請假人次 - 圓餅圖</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={departmentStats}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.name}: ${entry.count}`}
                      >
                        {departmentStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leavetype" className="mt-6">
            {leaveTypeStats.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>本期間無請假記錄</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">假別使用次數 - 長條圖</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={leaveTypeStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" name="使用次數" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">假別使用次數 - 圓餅圖</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={leaveTypeStats}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.name}: ${entry.count}`}
                      >
                        {leaveTypeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}