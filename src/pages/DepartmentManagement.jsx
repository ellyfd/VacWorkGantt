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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';

export default function DepartmentManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', sort_order: 0 });
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const depts = await base44.entities.Department.list('sort_order');
      return depts.filter(d => d.status !== 'hidden');
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Department.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Department.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Department.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['departments']),
  });

  const handleOpenDialog = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ name: dept.name, sort_order: dept.sort_order || 0 });
    } else {
      setEditingDept(null);
      setFormData({ name: '', sort_order: departments.length + 1 });
    }
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingDept(null);
    setFormData({ name: '', sort_order: 0 });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingDept) {
      updateMutation.mutate({ id: editingDept.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSortOrderChange = async (deptId, newOrder) => {
    const order = parseInt(newOrder);
    if (isNaN(order)) return;
    await base44.entities.Department.update(deptId, { sort_order: order });
    queryClient.invalidateQueries(['departments']);
  };

  const getEmployeeCount = (deptId) => {
    return employees.filter(e => e.department_ids?.includes(deptId)).length;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">部門管理</h1>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                新增部門
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDept ? '編輯部門' : '新增部門'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">部門名稱</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sort_order">排序順序</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : (
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
                        onChange={(e) => handleSortOrderChange(dept.id, e.target.value)}
                        className="w-10 h-7 text-center text-xs md:w-14"
                        min="1"
                        placeholder={(index + 1).toString()}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm md:text-base px-2 md:px-4">{dept.name}</TableCell>
                    <TableCell className="px-1 md:px-4">
                      <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                        {getEmployeeCount(dept.id)} 人
                      </span>
                    </TableCell>
                    <TableCell className="px-1 md:px-4">
                      <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(dept)}
                          className="h-7 w-7"
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(dept.id)}
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
          )}
        </div>
      </div>
    </div>
  );
}