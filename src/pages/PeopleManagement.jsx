import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, Users, Building2, Upload, Download } from 'lucide-react';

export default function PeopleManagement() {
  const [activeTab, setActiveTab] = useState('employees');
  const queryClient = useQueryClient();

  // ============ EMPLOYEE STATE ============
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeFormData, setEmployeeFormData] = useState({ name: '', english_name: '', deputy_1: '', deputy_2: '', department_ids: [], status: 'active', role: 'user', user_emails: [] });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({ department_ids: [], status: '' });

  // ============ DEPARTMENT STATE ============
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptFormData, setDeptFormData] = useState({ name: '', sort_order: 0 });

  // ============ QUERIES ============
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

  // ============ EMPLOYEE MUTATIONS ============
  const createEmployee = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      handleCloseEmployeeDialog();
    },
  });

  const updateEmployee = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      handleCloseEmployeeDialog();
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['employees']),
  });

  const bulkUpdateEmployee = useMutation({
    mutationFn: async (updates) => {
      await Promise.all(
        selectedEmployees.map(empId => {
          const emp = employees.find(e => e.id === empId);
          const updateData = {};
          if (updates.department_ids && updates.department_ids.length > 0) updateData.department_ids = updates.department_ids;
          if (updates.status) updateData.status = updates.status;
          return base44.entities.Employee.update(empId, updateData);
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setIsBulkEditOpen(false);
      setSelectedEmployees([]);
      setBulkEditData({ department_ids: [], status: '' });
    },
  });

  const bulkDeleteEmployee = useMutation({
    mutationFn: async () => {
      await Promise.all(selectedEmployees.map(empId => base44.entities.Employee.delete(empId)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setSelectedEmployees([]);
    },
  });

  // ============ DEPARTMENT MUTATIONS ============
  const createDept = useMutation({
    mutationFn: (data) => base44.entities.Department.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      handleCloseDeptDialog();
    },
  });

  const updateDept = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Department.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      handleCloseDeptDialog();
    },
  });

  const deleteDept = useMutation({
    mutationFn: (id) => base44.entities.Department.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['departments']),
  });

  // ============ EMPLOYEE HANDLERS ============
  const handleOpenEmployeeDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeFormData({
        name: employee.name,
        english_name: employee.english_name || '',
        deputy_1: employee.deputy_1 || '',
        deputy_2: employee.deputy_2 || '',
        department_ids: employee.department_ids || [],
        status: employee.status || 'active',
        role: employee.role || 'user',
        user_emails: employee.user_emails || [],
      });
    } else {
      setEditingEmployee(null);
      setEmployeeFormData({ name: '', english_name: '', deputy_1: '', deputy_2: '', department_ids: [], status: 'active', role: 'user', user_emails: [] });
    }
    setIsEmployeeOpen(true);
  };

  const handleCloseEmployeeDialog = () => {
    setIsEmployeeOpen(false);
    setEditingEmployee(null);
    setEmployeeFormData({ name: '', english_name: '', deputy_1: '', deputy_2: '', department_ids: [], status: 'active', role: 'user', user_emails: [] });
  };

  const handleSubmitEmployee = (e) => {
    e.preventDefault();
    if (editingEmployee) {
      updateEmployee.mutate({ id: editingEmployee.id, data: employeeFormData });
    } else {
      createEmployee.mutate(employeeFormData);
    }
  };

  const getEmployeesForDisplay = () => {
    if (selectedDepartments.length === 0) return employees;
    const employeesByDept = new Map();
    selectedDepartments.forEach(deptId => {
      const deptEmployees = employees
        .filter(emp => emp.department_ids?.includes(deptId))
        .map(emp => ({
          ...emp,
          currentDeptId: deptId,
          displayOrder: emp.sort_order_by_dept?.[deptId] || 999999
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder);
      deptEmployees.forEach(emp => {
        if (!employeesByDept.has(emp.id)) employeesByDept.set(emp.id, emp);
      });
    });
    return Array.from(employeesByDept.values());
  };

  const filteredEmployees = getEmployeesForDisplay();

  const handleDownloadTemplate = () => {
    const csvContent = "name,department_name\n張三,佈媽\n李四,TD-台北\n王五,3D team";
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '員工匯入模板.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        alert('檔案內容不正確');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/\uFEFF/g, ''));
      const nameIdx = headers.indexOf('name');
      const deptIdx = headers.indexOf('department_name');

      if (nameIdx === -1 || deptIdx === -1) {
        alert('CSV 檔案必須包含 name 和 department_name 欄位');
        return;
      }

      const employeesToCreate = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const name = values[nameIdx];
        const deptName = values[deptIdx];

        if (!name || !deptName) continue;

        const dept = departments.find(d => d.name === deptName);
        if (dept) {
          employeesToCreate.push({
            name,
            department_ids: [dept.id],
            status: 'active'
          });
        }
      }

      if (employeesToCreate.length > 0) {
        await base44.entities.Employee.bulkCreate(employeesToCreate);
        queryClient.invalidateQueries(['employees']);
        alert(`成功匯入 ${employeesToCreate.length} 位員工`);
      } else {
        alert('找不到符合的部門，請確認 CSV 中的部門名稱');
      }
    } catch (error) {
      alert('匯入失敗：' + error.message);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  // ============ DEPARTMENT HANDLERS ============
  const handleOpenDeptDialog = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setDeptFormData({ name: dept.name, sort_order: dept.sort_order || 0 });
    } else {
      setEditingDept(null);
      setDeptFormData({ name: '', sort_order: departments.length + 1 });
    }
    setIsDeptOpen(true);
  };

  const handleCloseDeptDialog = () => {
    setIsDeptOpen(false);
    setEditingDept(null);
    setDeptFormData({ name: '', sort_order: 0 });
  };

  const handleSubmitDept = (e) => {
    e.preventDefault();
    if (editingDept) {
      updateDept.mutate({ id: editingDept.id, data: deptFormData });
    } else {
      createDept.mutate(deptFormData);
    }
  };

  const getDepartmentNames = (deptIds) => {
    if (!deptIds || deptIds.length === 0) return '-';
    return deptIds.map(id => departments.find(d => d.id === id)?.name || '').filter(Boolean).join(', ');
  };

  const getEmployeeCount = (deptId) => {
    return employees.filter(e => e.department_ids?.includes(deptId)).length;
  };

  const handleDepartmentToggle = (deptId) => {
    setSelectedDepartments(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const handleSelectAllDepts = () => {
    if (selectedDepartments.length === departments.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(departments.map(d => d.id));
    }
  };

  const handleEmployeeToggle = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) 
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  const handleBulkEditSubmit = (e) => {
    e.preventDefault();
    bulkUpdateEmployee.mutate(bulkEditData);
  };

  const handleBulkDeleteEmps = () => {
    const confirmed = window.confirm(`確定要刪除選中的 ${selectedEmployees.length} 位員工嗎？此操作無法撤銷。`);
    if (confirmed) {
      bulkDeleteEmployee.mutate();
    }
  };

  const handleSortOrderChange = async (empId, deptId, newOrder) => {
    const order = parseInt(newOrder);
    if (isNaN(order)) return;
    const emp = employees.find(e => e.id === empId);
    const sortOrderByDept = emp.sort_order_by_dept || {};
    sortOrderByDept[deptId] = order;
    await base44.entities.Employee.update(empId, { sort_order_by_dept: sortOrderByDept });
    queryClient.invalidateQueries(['employees']);
  };

  const handleDeptSortOrderChange = async (deptId, newOrder) => {
    const order = parseInt(newOrder);
    if (isNaN(order)) return;
    await base44.entities.Department.update(deptId, { sort_order: order });
    queryClient.invalidateQueries(['departments']);
  };

  const isLoading = loadingDepts || loadingEmps;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">人員管理</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>員工管理</span>
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>部門管理</span>
            </TabsTrigger>
          </TabsList>

          {/* EMPLOYEES TAB */}
          <TabsContent value="employees" className="space-y-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">員工列表</h2>
              </div>
              <Dialog open={isEmployeeOpen} onOpenChange={setIsEmployeeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => handleOpenEmployeeDialog()} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-3 h-3 mr-1" />
                    新增員工
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingEmployee ? '編輯員工' : '新增員工'}</DialogTitle>
                  </DialogHeader>

                  {!editingEmployee && (
                    <div className="border-b pb-4 mb-4">
                      <h3 className="text-sm font-semibold mb-3 text-gray-700">批量匯入員工</h3>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadTemplate}
                          className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          下載模板
                        </Button>
                        <label htmlFor="excel-upload" className="flex-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isUploading}
                            onClick={() => document.getElementById('excel-upload').click()}
                            className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                匯入中...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                匯入 CSV
                              </>
                            )}
                          </Button>
                        </label>
                        <input
                          id="excel-upload"
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmitEmployee} className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="name">姓名</Label>
                        <Input
                          id="name"
                          value={employeeFormData.name}
                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="english_name">英文名字</Label>
                        <Input
                          id="english_name"
                          value={employeeFormData.english_name}
                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, english_name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="department">部門</Label>
                      <div className="mt-1 border rounded-md p-2 max-h-32 overflow-y-auto bg-white">
                        {departments.map((dept) => (
                          <label key={dept.id} className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={employeeFormData.department_ids.includes(dept.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEmployeeFormData({ ...employeeFormData, department_ids: [...employeeFormData.department_ids, dept.id] });
                                } else {
                                  setEmployeeFormData({ ...employeeFormData, department_ids: employeeFormData.department_ids.filter(id => id !== dept.id) });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm">{dept.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="deputy_1">第一順位職代</Label>
                        <Select
                          value={employeeFormData.deputy_1}
                          onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, deputy_1: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="選擇職代" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>無</SelectItem>
                            {employeeFormData.department_ids.length > 0 && employees
                              .filter(e => e.department_ids?.some(deptId => employeeFormData.department_ids.includes(deptId)) && e.id !== editingEmployee?.id)
                              .map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="deputy_2">第二順位職代</Label>
                        <Select
                          value={employeeFormData.deputy_2}
                          onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, deputy_2: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="選擇職代" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>無</SelectItem>
                            {employeeFormData.department_ids.length > 0 && employees
                              .filter(e => e.department_ids?.some(deptId => employeeFormData.department_ids.includes(deptId)) && e.id !== editingEmployee?.id && e.id !== employeeFormData.deputy_1)
                              .map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="status">狀態</Label>
                        <Select
                          value={employeeFormData.status}
                          onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, status: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="選擇狀態" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">在職</SelectItem>
                            <SelectItem value="inactive">離職</SelectItem>
                            <SelectItem value="parental_leave">育嬰假</SelectItem>
                            <SelectItem value="hidden">隱藏</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="role">角色</Label>
                        <Select
                          value={employeeFormData.role}
                          onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, role: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="選擇角色" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleCloseEmployeeDialog}>
                        取消
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        {editingEmployee ? '更新' : '新增'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mb-3 flex flex-col md:flex-row gap-3">
              <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-gray-700">篩選部門</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllDepts}
                    className="h-7 text-xs"
                  >
                    {selectedDepartments.length === departments.length ? '取消' : '全選'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {departments.map((dept) => (
                    <label key={dept.id} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedDepartments.includes(dept.id)}
                        onChange={() => handleDepartmentToggle(dept.id)}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span className="text-xs text-gray-700">{dept.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-gray-700">批量操作</Label>
                  {selectedEmployees.length > 0 && (
                    <span className="text-xs text-gray-500">已選 {selectedEmployees.length} 位</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsBulkEditOpen(true)}
                    disabled={selectedEmployees.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    編輯
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkDeleteEmps}
                    disabled={selectedEmployees.length === 0 || bulkDeleteEmployee.isPending}
                  >
                    {bulkDeleteEmployee.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        刪除中
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3 mr-1" />
                        刪除
                      </>
                    )}
                  </Button>
                  {selectedEmployees.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEmployees([])}
                      className="text-gray-600"
                    >
                      清除
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">
                  總計：{filteredEmployees.length} 位員工
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12 md:w-[5%]">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                        onChange={handleSelectAllEmployees}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </TableHead>
                    <TableHead className="min-w-[100px] md:w-[15%]">姓名</TableHead>
                    <TableHead className="min-w-[150px] md:w-[23%]">部門排序</TableHead>
                    <TableHead className="w-20 md:w-[10%]">狀態</TableHead>
                    <TableHead className="w-16 md:w-[17%]">編輯</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const displayDepts = selectedDepartments.length > 0
                      ? departments.filter(d => emp.department_ids?.includes(d.id) && selectedDepartments.includes(d.id))
                      : departments.filter(d => emp.department_ids?.includes(d.id));

                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(emp.id)}
                            onChange={() => handleEmployeeToggle(emp.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            {displayDepts.map((dept) => (
                              <div key={dept.id} className="flex items-center gap-2">
                                <span className="text-xs text-gray-700 min-w-[60px]">{dept.name}:</span>
                                <Input
                                  type="number"
                                  value={emp.sort_order_by_dept?.[dept.id] ?? ''}
                                  onChange={(e) => handleSortOrderChange(emp.id, dept.id, e.target.value)}
                                  className="w-16 h-6 text-center text-xs"
                                  min="1"
                                />
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                            emp.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : emp.status === 'parental_leave'
                              ? 'bg-blue-100 text-blue-800'
                              : emp.status === 'hidden'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {emp.status === 'active' ? '在職' : emp.status === 'parental_leave' ? '育嬰假' : emp.status === 'hidden' ? '隱藏' : '離職'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEmployeeDialog(emp)}
                              className="h-8 w-8"
                            >
                              <Pencil className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEmployee.mutate(emp.id)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>批量編輯員工 ({selectedEmployees.length} 位)</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBulkEditSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="bulk-department">部門 (不勾選表示不修改)</Label>
                    <div className="mt-1 border rounded-md p-2 max-h-32 overflow-y-auto bg-white">
                      {departments.map((dept) => (
                        <label key={dept.id} className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bulkEditData.department_ids.includes(dept.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkEditData({ ...bulkEditData, department_ids: [...bulkEditData.department_ids, dept.id] });
                              } else {
                                setBulkEditData({ ...bulkEditData, department_ids: bulkEditData.department_ids.filter(id => id !== dept.id) });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm">{dept.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bulk-status">狀態 (留空表示不修改)</Label>
                    <Select
                      value={bulkEditData.status}
                      onValueChange={(value) => setBulkEditData({ ...bulkEditData, status: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="選擇狀態" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>不修改</SelectItem>
                        <SelectItem value="active">在職</SelectItem>
                        <SelectItem value="inactive">離職</SelectItem>
                        <SelectItem value="parental_leave">育嬰假</SelectItem>
                        <SelectItem value="hidden">隱藏</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsBulkEditOpen(false)}>
                      取消
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={bulkEditData.department_ids.length === 0 && !bulkEditData.status}
                    >
                      確認更新
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* DEPARTMENTS TAB */}
          <TabsContent value="departments" className="space-y-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">部門列表</h2>
              </div>
              <Dialog open={isDeptOpen} onOpenChange={setIsDeptOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDeptDialog()} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    新增部門
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingDept ? '編輯部門' : '新增部門'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitDept} className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="name">部門名稱</Label>
                      <Input
                        id="name"
                        value={deptFormData.name}
                        onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sort_order">排序順序</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        value={deptFormData.sort_order}
                        onChange={(e) => setDeptFormData({ ...deptFormData, sort_order: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleCloseDeptDialog}>
                        取消
                      </Button>
                      <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                        {editingDept ? '更新' : '新增'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-14 md:w-[8%] px-1 md:px-4">排序</TableHead>
                    <TableHead className="px-2 md:px-4 md:w-[50%]">部門名稱</TableHead>
                    <TableHead className="w-20 md:w-[22%] px-1 md:px-4">員工人數</TableHead>
                    <TableHead className="w-12 md:w-[20%] px-1 md:px-4">編輯</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept, index) => (
                    <TableRow key={dept.id}>
                      <TableCell className="px-1 md:px-4">
                        <Input
                          type="number"
                          value={dept.sort_order ?? ''}
                          onChange={(e) => handleDeptSortOrderChange(dept.id, e.target.value)}
                          className="w-10 h-7 text-center text-xs md:w-14"
                          min="1"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm md:text-base px-2 md:px-4">{dept.name}</TableCell>
                      <TableCell className="px-1 md:px-4">
                        <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                          {getEmployeeCount(dept.id)} 人
                        </span>
                      </TableCell>
                      <TableCell className="px-1 md:px-4">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeptDialog(dept)}
                            className="h-7 w-7"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteDept.mutate(dept.id)}
                            className="h-7 w-7"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}