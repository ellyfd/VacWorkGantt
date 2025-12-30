import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Calendar, Users, Building2, Tag, Menu, X, CalendarClock, Home, LogOut, Settings, ChevronDown, ChevronRight, Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const navItems = [
  { name: 'Dashboard', label: '儀表板', icon: Calendar },
  { name: 'LeaveCalendar', label: '我的排休', icon: CalendarClock },
  { name: 'AllLeaveCalendar', label: '全部排休', icon: Calendar },
];

const settingsItems = [
  { name: 'EmployeeManagement', label: '員工管理', icon: Users },
  { name: 'DepartmentManagement', label: '部門管理', icon: Building2 },
  { name: 'LeaveTypeManagement', label: '假別管理', icon: Tag },
  { name: 'HolidayManagement', label: '假日管理', icon: CalendarClock },
];

export default function Layout({ children, currentPageName }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
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
    refetchInterval: 30000, // 每30秒刷新
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(unreadNotifications.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  useEffect(() => {
    // 只有在資料載入完成後，且用戶不是 admin，且沒有綁定員工時，才顯示綁定對話框
    if (currentUser && !loadingBoundEmployee && currentUser.role !== 'admin' && boundEmployee === null) {
      setShowBindDialog(true);
    }
  }, [currentUser, boundEmployee, loadingBoundEmployee]);

  const bindMutation = useMutation({
    mutationFn: async (employeeId) => {
      const emp = employees.find(e => e.id === employeeId);
      const existingEmails = emp?.user_emails || [];
      
      if (existingEmails.length > 0 && !existingEmails.includes(currentUser.email)) {
        const confirmed = window.confirm(
          `此員工 ${emp.name} 已綁定以下帳號：\n${existingEmails.join('\n')}\n\n確定要綁定新帳號 ${currentUser.email} 嗎？`
        );
        if (!confirmed) {
          throw new Error('取消綁定');
        }
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

  const handleBind = () => {
    if (selectedEmployeeId) {
      bindMutation.mutate(selectedEmployeeId);
    }
  };

  const filteredEmployees = selectedDepartmentId 
    ? employees.filter(emp => emp.department_ids?.includes(selectedDepartmentId))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed h-full">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-800">排休登記系統</h1>
        </div>
        <nav className="flex-1 p-4 flex flex-col">
          <ul className="space-y-1 flex-1">
            {navItems.map((item) => {
              const isActive = currentPageName === item.name;
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={createPageUrl(item.name)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                onClick={() => setSettingsExpanded(!settingsExpanded)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <Settings className="w-5 h-5" />
                <span className="flex-1 text-left">設定管理</span>
                {settingsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {settingsExpanded && (
                <ul className="mt-1 ml-4 space-y-1">
                  {settingsItems.map((item) => {
                    const isActive = currentPageName === item.name;
                    const Icon = item.icon;
                    return (
                      <li key={item.name}>
                        <Link
                          to={createPageUrl(item.name)}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          </ul>
          <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900 relative"
            >
              <Bell className="w-5 h-5" />
              通知
              {unreadCount > 0 && (
                <span className="absolute left-8 top-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => base44.auth.logout()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="w-5 h-5" />
              登出
            </button>
          </div>
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-gray-800">排休登記系統</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="bg-white border-t border-gray-100 p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = currentPageName === item.name;
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      to={createPageUrl(item.name)}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <button
                  onClick={() => setSettingsExpanded(!settingsExpanded)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
                >
                  <Settings className="w-5 h-5" />
                  <span className="flex-1 text-left">設定管理</span>
                  {settingsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {settingsExpanded && (
                  <ul className="mt-1 ml-4 space-y-1">
                    {settingsItems.map((item) => {
                      const isActive = currentPageName === item.name;
                      const Icon = item.icon;
                      return (
                        <li key={item.name}>
                          <Link
                            to={createPageUrl(item.name)}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                              isActive
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900 relative"
              >
                <Bell className="w-5 h-5" />
                通知
                {unreadCount > 0 && (
                  <span className="absolute left-8 top-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => base44.auth.logout()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="w-5 h-5" />
                登出
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 overflow-x-hidden min-w-0 w-full">
        {children}
      </main>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 overflow-y-auto border-l border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
            <h2 className="text-lg font-bold text-gray-800">通知</h2>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-xs"
                >
                  全部標為已讀
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowNotifications(false)}
              >
                ✕
              </Button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>目前沒有通知</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${!notif.is_read ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    if (!notif.is_read) {
                      markAsReadMutation.mutate(notif.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.is_read ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notif.created_date).toLocaleString('zh-TW', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}