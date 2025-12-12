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
import { Plus, Pencil, Trash2, Loader2, Users, Upload, Download, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function EmployeeManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', department_id: '', status: 'active' });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({ department_id: '', status: '' });
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list('sort_order'),
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('sort_order'),
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
          if (updates.department_id) updateData.department_id = updates.department_id;
          if (updates.status) updateData.status = updates.status;
          return base44.entities.Employee.update(empId, updateData);
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setIsBulkEditOpen(false);
      setSelectedEmployees([]);
      setBulkEditData({ department_id: '', status: '' });
    },
  });

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        code: employee.code || '',
        department_id: employee.department_id,
        status: employee.status || 'active',
      });
    } else {
      setEditingEmployee(null);
      setFormData({ name: '', code: '', department_id: departments[0]?.id || '', status: 'active' });
    }
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingEmployee(null);
    setFormData({ name: '', code: '', department_id: '', status: 'active' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getDepartmentName = (deptId) => {
    return departments.find(d => d.id === deptId)?.name || '-';
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
    : employees.filter(emp => selectedDepartments.includes(emp.department_id));

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

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(filteredEmployees);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sort_order for all affected employees
    const updates = items.map((emp, index) => 
      base44.entities.Employee.update(emp.id, { sort_order: index })
    );

    await Promise.all(updates);
    queryClient.invalidateQueries(['employees']);
  };

  const handleDownloadTemplate = () => {
    const csvContent = "name,code,department_name\n張三,A01,佈媽\n李四,B02,TD-台北\n王五,C03,3D team";
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
      const codeIdx = headers.indexOf('code');
      const deptIdx = headers.indexOf('department_name');

      if (nameIdx === -1 || deptIdx === -1) {
        alert('CSV 檔案必須包含 name 和 department_name 欄位');
        return;
      }

      const employeesToCreate = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const name = values[nameIdx];
        const code = codeIdx !== -1 ? values[codeIdx] : '';
        const deptName = values[deptIdx];

        if (!name || !deptName) continue;

        const dept = departments.find(d => d.name === deptName);
        if (dept) {
          employeesToCreate.push({
            name,
            code: code || '',
            department_id: dept.id,
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">員工管理</h1>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              下載模板
            </Button>
            <label htmlFor="excel-upload">
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => document.getElementById('excel-upload').click()}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    匯入中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Excel 匯入
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
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  新增員工
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEmployee ? '編輯員工' : '新增員工'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
                  <Label htmlFor="code">職代</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="department">部門</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="選擇部門" />
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
                <div>
                  <Label htmlFor="status">在職狀態</Label>
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
                    </SelectContent>
                  </Select>
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Excel 匯入格式說明：</strong>Excel 檔案需包含以下欄位：<br />
            • <strong>name</strong> (姓名) - 必填<br />
            • <strong>code</strong> (職代) - 選填<br />
            • <strong>department_name</strong> (部門名稱) - 必填，需與系統中的部門名稱完全一致
          </p>
        </div>

        <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold text-gray-700">批量操作</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setIsBulkEditOpen(true)}
                disabled={selectedEmployees.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
              >
                <Pencil className="w-3 h-3 mr-1" />
                批量編輯 {selectedEmployees.length > 0 && `(${selectedEmployees.length})`}
              </Button>
              {selectedEmployees.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployees([])}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  清除選擇
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold text-gray-700">篩選部門</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-8"
            >
              {selectedDepartments.length === departments.length ? '取消全選' : '全選'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {departments.map((dept) => (
              <label
                key={dept.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-md border border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedDepartments.includes(dept.id)}
                  onChange={() => handleDepartmentToggle(dept.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{dept.name}</span>
              </label>
            ))}
          </div>
          {selectedDepartments.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              已選擇 {selectedDepartments.length} 個部門
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                        onChange={handleSelectAllEmployees}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>職代</TableHead>
                    <TableHead>部門</TableHead>
                    <TableHead>在職狀態</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <Droppable droppableId="employees">
                  {(provided) => (
                    <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                      {filteredEmployees.map((emp, index) => (
                        <Draggable key={emp.id} draggableId={emp.id} index={index}>
                          {(provided, snapshot) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={snapshot.isDragging ? 'bg-blue-50' : ''}
                            >
                              <TableCell {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                              </TableCell>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedEmployees.includes(emp.id)}
                                  onChange={() => handleEmployeeToggle(emp.id)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </TableCell>
                              <TableCell className="font-medium">{emp.name}</TableCell>
                              <TableCell className="text-gray-500">{emp.code || '-'}</TableCell>
                              <TableCell>{getDepartmentName(emp.department_id)}</TableCell>
                              <TableCell>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  emp.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {emp.status === 'active' ? '在職' : '離職'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
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
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  )}
                </Droppable>
              </Table>
            </DragDropContext>
          )}
        </div>

        <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>批量編輯員工 ({selectedEmployees.length} 位)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBulkEditSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="bulk-department">部門 (留空表示不修改)</Label>
                <Select
                  value={bulkEditData.department_id}
                  onValueChange={(value) => setBulkEditData({ ...bulkEditData, department_id: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="選擇部門" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>不修改</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bulk-status">在職狀態 (留空表示不修改)</Label>
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
                  disabled={!bulkEditData.department_id && !bulkEditData.status}
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