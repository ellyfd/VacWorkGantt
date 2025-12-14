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
import { Plus, Pencil, Trash2, Loader2, Users, Upload, Download } from 'lucide-react';

export default function EmployeeManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({ name: '', english_name: '', deputy_1: '', deputy_2: '', department_ids: [], status: 'active', user_emails: [] });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({ department_ids: [], status: '' });
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const depts = await base44.entities.Department.list('sort_order');
      return depts.filter(d => d.status !== 'hidden');
    },
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['employees']),
  });

  const bulkUpdateMutation = useMutation({
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        selectedEmployees.map(empId => base44.entities.Employee.delete(empId))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setSelectedEmployees([]);
    },
  });

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        english_name: employee.english_name || '',
        deputy_1: employee.deputy_1 || '',
        deputy_2: employee.deputy_2 || '',
        department_ids: employee.department_ids || [],
        status: employee.status || 'active',
        user_emails: employee.user_emails || [],
      });
    } else {
      setEditingEmployee(null);
      setFormData({ name: '', english_name: '', deputy_1: '', deputy_2: '', department_ids: [], status: 'active', user_emails: [] });
    }
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingEmployee(null);
    setFormData({ name: '', english_name: '', deputy_1: '', deputy_2: '', department_ids: [], status: 'active', user_emails: [] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getDepartmentNames = (deptIds) => {
    if (!deptIds || deptIds.length === 0) return '-';
    return deptIds.map(id => departments.find(d => d.id === id)?.name || '').filter(Boolean).join(', ');
  };

  const handleDepartmentToggle = (deptId) => {
    setSelectedDepartments(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDepartments.length === departments.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(departments.map(d => d.id));
    }
  };

  const filteredEmployees = selectedDepartments.length === 0
    ? employees 
    : employees.filter(emp => emp.department_ids?.some(deptId => selectedDepartments.includes(deptId)));

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
    bulkUpdateMutation.mutate(bulkEditData);
  };

  const handleBulkDelete = () => {
    const confirmed = window.confirm(`確定要刪除選中的 ${selectedEmployees.length} 位員工嗎？此操作無法撤銷。`);
    if (confirmed) {
      bulkDeleteMutation.mutate();
    }
  };

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

      // Parse CSV
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">員工管理</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
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
                  <p className="text-xs text-gray-500 mt-2">支援批量匯入員工資料，請先下載模板填寫後上傳</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="name">姓名</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="english_name">英文名字</Label>
                    <Input
                      id="english_name"
                      value={formData.english_name}
                      onChange={(e) => setFormData({ ...formData, english_name: e.target.value })}
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
                          checked={formData.department_ids.includes(dept.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, department_ids: [...formData.department_ids, dept.id] });
                            } else {
                              setFormData({ ...formData, department_ids: formData.department_ids.filter(id => id !== dept.id) });
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
                      value={formData.deputy_1}
                      onValueChange={(value) => setFormData({ ...formData, deputy_1: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="選擇職代" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>無</SelectItem>
                        {formData.department_ids.length > 0 && employees
                          .filter(e => e.department_ids?.some(deptId => formData.department_ids.includes(deptId)) && e.id !== editingEmployee?.id)
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
                      value={formData.deputy_2}
                      onValueChange={(value) => setFormData({ ...formData, deputy_2: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="選擇職代" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>無</SelectItem>
                        {formData.department_ids.length > 0 && employees
                          .filter(e => e.department_ids?.some(deptId => formData.department_ids.includes(deptId)) && e.id !== editingEmployee?.id && e.id !== formData.deputy_1)
                          .map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">狀態</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
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
                  <Label htmlFor="user_emails">綁定登入帳號（可多個）</Label>
                  <div className="mt-1 space-y-2">
                    {formData.user_emails.map((email, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...formData.user_emails];
                            newEmails[idx] = e.target.value;
                            setFormData({ ...formData, user_emails: newEmails });
                          }}
                          placeholder="user@example.com"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newEmails = formData.user_emails.filter((_, i) => i !== idx);
                            setFormData({ ...formData, user_emails: newEmails });
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, user_emails: [...formData.user_emails, ''] });
                      }}
                      className="w-full"
                    >
                      + 新增帳號
                    </Button>
                  </div>
                  </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
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
        </div>

        <div className="mb-3 flex flex-col md:flex-row gap-3">
          <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold text-gray-700">篩選部門</Label>
              <div className="flex items-center gap-2">
                {selectedDepartments.length > 0 && (
                  <span className="text-xs text-gray-500">已選 {selectedDepartments.length} 個</span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs"
                >
                  {selectedDepartments.length === departments.length ? '取消' : '全選'}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <label
                  key={dept.id}
                  className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded border border-gray-200"
                >
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
                onClick={handleBulkDelete}
                disabled={selectedEmployees.length === 0 || bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? (
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">
                  總計：{filteredEmployees.length} 位員工
                </span>
              </div>
              <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={handleSelectAllEmployees}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </TableHead>
                  <TableHead className="w-[150px]">姓名</TableHead>
                  <TableHead className="w-[150px]">英文名字</TableHead>
                  <TableHead className="flex-1">部門</TableHead>
                  <TableHead className="w-[100px]">狀態</TableHead>
                  <TableHead className="w-[120px] text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
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
                    <TableCell className="text-sm text-gray-600">{emp.english_name || '-'}</TableCell>
                    <TableCell className="text-sm">{getDepartmentNames(emp.department_ids)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(emp)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(emp.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
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
                  {bulkUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    '確認更新'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}