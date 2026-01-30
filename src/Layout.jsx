import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Calendar, Users, Building2, Tag, Menu, X, CalendarClock, Home, LogOut, Settings, ChevronDown, ChevronRight, Bell, BarChart3, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const navItems = [
  { name: 'Dashboard', label: '儀表板', icon: Calendar },
  { name: 'LeaveCalendar', label: '我的排休', icon: CalendarClock },
  { name: 'AllLeaveCalendar', label: '全部排休', icon: Calendar },
  { name: 'GanttManagement', label: '專案甘特圖', icon: BarChart3 },
  { name: 'Notifications', label: '通知', icon: Bell },
];

const settingsItems = [
  { name: 'PeopleManagement', label: '人員管理', icon: Users },
  { name: 'LeaveSettings', label: '休假設定', icon: CalendarClock },
  { name: 'ProjectSettings', label: '專案設定', icon: BarChart3 },
  { name: 'DataImport', label: '資料匯入', icon: Upload },
  { name: 'ReportManagement', label: '報表管理', icon: BarChart3 },
];

export default function Layout({ children, currentPageName }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [settingsExpanded, setSettingsExpanded] = useState(true);
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

  useEffect(() => {
    // 只有在資料載入完成後，且用戶不是 admin，且沒有綁定員工時，才顯示綁定對話框
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
        // 顯示確認對話框
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                    {item.name === 'Notifications' && unreadCount > 0 && (
                      <span className="absolute left-8 top-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
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
          <div className="mt-auto pt-4 border-t border-gray-200">
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                      {item.name === 'Notifications' && unreadCount > 0 && (
                        <span className="absolute left-8 top-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
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
            <div className="mt-4 pt-4 border-t border-gray-200">
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
    </div>
  );
}