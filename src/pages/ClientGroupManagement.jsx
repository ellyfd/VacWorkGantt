import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ClientGroupManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({ name: '', sort_order: 0 });
  const queryClient = useQueryClient();

  const { data: clientGroups = [], isLoading } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => base44.entities.ClientGroup.list('sort_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientGroups']);
      setDialogOpen(false);
      setFormData({ name: '', sort_order: 0 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientGroup.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientGroups']);
      setDialogOpen(false);
      setEditingGroup(null);
      setFormData({ name: '', sort_order: 0 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientGroups']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({ name: group.name, sort_order: group.sort_order || 0 });
    setDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('確定要刪除此客戶群組嗎？')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">客戶群組管理</h1>
          </div>
          <Button onClick={() => { setEditingGroup(null); setFormData({ name: '', sort_order: 0 }); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            新增客戶群組
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>客戶群組列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>群組名稱</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.sort_order || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(group)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(group.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? '編輯客戶群組' : '新增客戶群組'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">群組名稱</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sort_order">排序順序</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">儲存</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}