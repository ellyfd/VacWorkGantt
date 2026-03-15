import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { format, endOfMonth } from 'date-fns';
import { Calendar, Users, Building2, Tag, Menu, X, CalendarClock, Home, LogOut, Settings, ChevronDown, ChevronRight, Bell, BarChart3, Upload, MoreHorizontal, UserCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { name: 'Dashboard', label: '儀表板', icon: Home },
  { name: 'LeaveCalendar', label: '我的排休', icon: CalendarClock },
  { name: 'AllLeaveCalendar', label: '全部排休', icon: Calendar },
  { name: 'GanttManagement', label: '專案甘特圖', icon: BarChart3 },
  { name: 'Notifications', label: '通知', icon: Bell },
];

const settingsItems = [
  { name: 'PeopleManagement', label: '人員管理', icon: Users },
  { name: 'LeaveSettings', label: '休假設定', icon: CalendarClock },
  { name: 'ProjectSettings', label: '專案設定', icon: BarChart3 },
  { name: 'ReportManagement', label: '報表管理', icon: BarChart3 },
];

// Mobile bottom tab items (max 5 for thumb-reachable UX)
const mobileTabItems = [
  { name: 'Dashboard', label: '首頁', icon: Home },
  { name: 'LeaveCalendar', label: '我的排休', icon: CalendarClock },
  { name: 'AllLeaveCalendar', label: '全部排休', icon: Calendar },
  { name: 'Notifications', label: '通知', icon: Bell },
];

export default function Layout({ children, currentPageName }) {
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
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

  const { data: boundEmployee, isLoading: loadingBoundEmployee } = useQuery({
    queryKey: ['boundEmployee', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const allEmps = await base44.entities.Employee.list();
      const emp = allEmps.find(e => e.user_emails?.includes(currentUser.email));
      return emp || null;
    },
    enabled: !!currentUser?.email,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return base44.entities.Notification.filter({
        recipient_email: currentUser.email
      }, '-created_date', 50);
    },
    enabled: !!currentUser?.email,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const [profileOpen, setProfileOpen] = useState(false);
  const [editingDeputy, setEditingDeputy] = useState(false);
  const [deputy1Id, setDeputy1Id] = useState('');
  const [deputy2Id, setDeputy2Id] = useState('');

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => base44.entities.LeaveType.list('sort_order'),
  });

  // 個人請假紀錄：當月 + 當年
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const { data: yearlyLeaveRecords = [] } = useQuery({
    queryKey: ['myLeaveRecords', boundEmployee?.id, currentYear],
    queryFn: () => base44.entities.LeaveRecord.filter({
      employee_id: boundEmployee.id,
      date: { $gte: `${currentYear}-01-01`, $lte: `${currentYear}-12-31` }
    }),
    enabled: !!boundEmployee?.id && profileOpen,
  });

  const myLeaveSummary = useMemo(() => {
    if (!yearlyLeaveRecords.length || !leaveTypes.length) return { monthly: [], yearly: [], monthlyTotal: 0, yearlyTotal: 0 };

    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const monthPrefix = `${currentYear}-${monthStr}`;

    const calcSummary = (records) => {
      const counts = {};
      records.forEach(r => {
        const lt = leaveTypes.find(t => t.id === r.leave_type_id);
        if (!lt) return;
        if (!counts[lt.id]) counts[lt.id] = { name: lt.name, short_name: lt.short_name, color: lt.color, count: 0 };
        counts[lt.id].count += (r.period === 'AM' || r.period === 'PM') ? 0.5 : 1;
      });
      const list = Object.values(counts).sort((a, b) => b.count - a.count);
      return { list, total: list.reduce((s, i) => s + i.count, 0) };
    };

    const monthlyRecords = yearlyLeaveRecords.filter(r => r.date.startsWith(monthPrefix));
    const monthly = calcSummary(monthlyRecords);
    const yearly = calcSummary(yearlyLeaveRecords);
    return { monthly: monthly.list, yearly: yearly.list, monthlyTotal: monthly.total, yearlyTotal: yearly.total };
  }, [yearlyLeaveRecords, leaveTypes, currentYear, currentMonth]);

  // 所屬部門名稱
  const myDepartments = useMemo(() => {
    if (!boundEmployee?.department_ids?.length || !departments.length) return [];
    return departments.filter(d => boundEmployee.department_ids.includes(d.id));
  }, [boundEmployee, departments]);

  // 職代名稱
  const deputyNames = useMemo(() => {
    if (!boundEmployee) return [];
    return [boundEmployee.deputy_1, boundEmployee.deputy_2]
      .filter(Boolean)
      .map(id => employees.find(e => e.id === id)?.name)
      .filter(Boolean);
  }, [boundEmployee, employees]);

  useEffect(() => {
    if (currentUser && !loadingBoundEmployee && currentUser.role !== 'admin' && boundEmployee === null) {
      setShowBindDialog(true);
    }
  }, [currentUser, boundEmployee, loadingBoundEmployee]);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  const bindMutation = useMutation({
    mutationFn: async (employeeId) => {
      const emp = employees.find(e => e.id === employeeId);
      const existingEmails = emp?.user_emails || [];

      if (existingEmails.length > 0 && !existingEmails.includes(currentUser.email)) {
        return new Promise((resolve, reject) => {
          setConfirmData({
            emp,
            existingEmails,
            employeeId,
            resolve,
            reject
          });
          setShowConfirmDialog(true);
        });
      }

      if (!existingEmails.includes(currentUser.email)) {
        await base44.entities.Employee.update(employeeId, {
          user_emails: [...existingEmails, currentUser.email]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['boundEmployee']);
      queryClient.invalidateQueries(['employees']);
      setShowBindDialog(false);
      setSelectedEmployeeId('');
      setSelectedDepartmentId('');
    },
  });

  const handleConfirmBind = async () => {
    if (!confirmData) return;

    try {
      await base44.entities.Employee.update(confirmData.employeeId, {
        user_emails: [...confirmData.existingEmails, currentUser.email]
      });
      confirmData.resolve();
      queryClient.invalidateQueries(['boundEmployee']);
      queryClient.invalidateQueries(['employees']);
      setShowBindDialog(false);
      setSelectedEmployeeId('');
      setSelectedDepartmentId('');
    } catch (error) {
      confirmData.reject(error);
    } finally {
      setShowConfirmDialog(false);
      setConfirmData(null);
    }
  };

  const handleBind = () => {
    if (selectedEmployeeId) {
      bindMutation.mutate(selectedEmployeeId);
    }
  };

  const filteredEmployees = selectedDepartmentId
    ? employees.filter(emp => emp.department_ids?.includes(selectedDepartmentId))
    : [];

  const isSettingsPage = settingsItems.some(item => item.name === currentPageName);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed h-full">
        {/* User section - clickable to open profile */}
        <button
          onClick={() => setProfileOpen(true)}
          className="w-full p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-800 truncate">
                {boundEmployee?.name || currentUser?.email?.split('@')[0] || '使用者'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {currentUser?.email || ''}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>
        </button>

        <nav className="flex-1 p-3 flex flex-col overflow-y-auto">
          {/* Main nav */}
          <div className="mb-2">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              主要功能
            </div>
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = currentPageName === item.name;
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      to={createPageUrl(item.name)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative text-sm ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {item.label}
                      {item.name === 'Notifications' && unreadCount > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Settings section */}
          <div className="mt-1">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="w-full flex items-center gap-3 px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            >
              <span className="flex-1 text-left">設定管理</span>
              {settingsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {settingsExpanded && (
              <ul className="space-y-0.5">
                {settingsItems.map((item) => {
                  const isActive = currentPageName === item.name;
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <Link
                        to={createPageUrl(item.name)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${
                          isActive
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Logout at bottom */}
          <div className="mt-auto pt-3 border-t border-gray-100">
            <button
              onClick={() => base44.auth.logout()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm text-gray-500 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="w-5 h-5" />
              登出
            </button>
          </div>
        </nav>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <nav className="flex items-stretch h-14">
          {mobileTabItems.map((item) => {
            const isActive = currentPageName === item.name;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {item.name === 'Notifications' && unreadCount > 0 && (
                  <span className="absolute top-1.5 left-1/2 ml-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
          {/* More tab - opens sheet with all nav + settings */}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <button
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isSettingsPage || currentPageName === 'GanttManagement' ? 'text-blue-600' : 'text-gray-400'
                }`}
                aria-label="更多選項"
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-[10px] font-medium">更多</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
              <SheetHeader className="pb-2">
                <SheetTitle className="text-left">更多功能</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto pb-6">
                {/* User info - clickable to open profile */}
                <button
                  onClick={() => { setMobileSheetOpen(false); setProfileOpen(true); }}
                  className="w-full flex items-center gap-3 px-2 py-3 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {boundEmployee?.name || currentUser?.email?.split('@')[0] || '使用者'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {currentUser?.email || ''}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {/* Gantt link */}
                <Link
                  to={createPageUrl('GanttManagement')}
                  onClick={() => setMobileSheetOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    currentPageName === 'GanttManagement'
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-sm">專案甘特圖</span>
                </Link>

                {/* Settings section */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    設定管理
                  </div>
                  <ul className="space-y-0.5">
                    {settingsItems.map((item) => {
                      const isActive = currentPageName === item.name;
                      const Icon = item.icon;
                      return (
                        <li key={item.name}>
                          <Link
                            to={createPageUrl(item.name)}
                            onClick={() => setMobileSheetOpen(false)}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                              isActive
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-sm">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Logout */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => { setMobileSheetOpen(false); base44.auth.logout(); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-gray-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm">登出</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-16 md:pb-0 overflow-x-hidden min-w-0 w-full">
        {children}
      </main>

      {/* Employee Binding Dialog */}
      <Dialog open={showBindDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>綁定員工資料</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">請選擇您的員工身份以繼續使用系統</p>
            <div>
              <Label htmlFor="department">選擇部門</Label>
              <Select value={selectedDepartmentId} onValueChange={(value) => {
                setSelectedDepartmentId(value);
                setSelectedEmployeeId('');
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="請先選擇部門..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDepartmentId && (
              <div>
                <Label htmlFor="employee">選擇員工</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="請選擇員工..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} {emp.english_name ? `(${emp.english_name})` : ''} {emp.user_emails?.length > 0 ? `- 已綁定${emp.user_emails.length}個帳號` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={handleBind}
              disabled={!selectedEmployeeId || bindMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {bindMutation.isPending ? '綁定中...' : '確認綁定'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Bind Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認綁定</DialogTitle>
            <DialogDescription>
              此員工 {confirmData?.emp?.name} 已綁定以下帳號：
              <div className="mt-2 space-y-1">
                {confirmData?.existingEmails?.map((email, idx) => (
                  <div key={idx} className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {email}
                  </div>
                ))}
              </div>
              <div className="mt-2">
                確定要綁定新帳號 <span className="font-semibold">{currentUser?.email}</span> 嗎？
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                confirmData?.reject(new Error('取消綁定'));
                setShowConfirmDialog(false);
                setConfirmData(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmBind}
              className="bg-blue-600 hover:bg-blue-700"
            >
              確定綁定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 個人資料 Sheet */}
      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>個人資料</SheetTitle>
          </SheetHeader>

          {/* 基本資訊 */}
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <UserCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-gray-900">
                  {boundEmployee?.name || '未綁定'}
                </div>
                {boundEmployee?.english_name && (
                  <div className="text-sm text-gray-500">{boundEmployee.english_name}</div>
                )}
                <div className="text-xs text-gray-400 mt-0.5">{currentUser?.email}</div>
              </div>
            </div>

            {/* 個人資訊 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-[11px] text-gray-400 mb-1">部門</div>
                <div className="text-sm font-medium text-gray-800">
                  {myDepartments.length > 0 ? myDepartments.map(d => d.name).join('、') : '—'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-[11px] text-gray-400 mb-1">職務代理人</div>
                <div className="text-sm font-medium text-gray-800">
                  {deputyNames.length > 0 ? deputyNames.join('、') : '—'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-[11px] text-gray-400 mb-1">狀態</div>
                <div className="text-sm font-medium text-gray-800">
                  {boundEmployee?.status === 'active' ? '在職' :
                   boundEmployee?.status === 'parental_leave' ? '育嬰假' :
                   boundEmployee?.status === 'hidden' ? '隱藏' :
                   boundEmployee?.status === 'inactive' ? '離職' : '—'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-[11px] text-gray-400 mb-1">角色</div>
                <div className="text-sm font-medium text-gray-800">
                  {currentUser?.role === 'admin' ? '管理員' : '一般使用者'}
                </div>
              </div>
            </div>

            {/* 當月請假小計 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                {currentMonth + 1} 月請假小計
              </h3>
              {myLeaveSummary.monthly.length === 0 ? (
                <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg">本月無請假紀錄</p>
              ) : (
                <div className="space-y-1.5">
                  {myLeaveSummary.monthly.map((item) => (
                    <div key={item.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{item.count} 天</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1.5 px-3 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">小計</span>
                    <span className="text-sm font-bold text-gray-900">{myLeaveSummary.monthlyTotal} 天</span>
                  </div>
                </div>
              )}
            </div>

            {/* 年度請假小計 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                {currentYear} 年度累計
              </h3>
              {myLeaveSummary.yearly.length === 0 ? (
                <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg">本年度無請假紀錄</p>
              ) : (
                <div className="space-y-1.5">
                  {myLeaveSummary.yearly.map((item) => (
                    <div key={item.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{item.count} 天</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1.5 px-3 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">年度合計</span>
                    <span className="text-sm font-bold text-gray-900">{myLeaveSummary.yearlyTotal} 天</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}