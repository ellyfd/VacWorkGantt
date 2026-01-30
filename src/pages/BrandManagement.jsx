import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BrandManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({ group_id: '', name: '', sort_order: 0 });
  const queryClient = useQueryClient();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => base44.entities.Brand.list('sort_order'),
  });

  const { data: clientGroups = [] } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => base44.entities.ClientGroup.list('sort_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Brand.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['brands']);
      setDialogOpen(false);
      setFormData({ group_id: '', name: '', sort_order: 0 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Brand.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['brands']);
      setDialogOpen(false);
      setEditingBrand(null);
      setFormData({ group_id: '', name: '', sort_order: 0 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Brand.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['brands']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({ group_id: brand.group_id, name: brand.name, sort_order: brand.sort_order || 0 });
    setDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('確定要刪除此品牌嗎？')) {
      deleteMutation.mutate(id);
    }
  };

  const getGroupName = (groupId) => {
    const group = clientGroups.find(g => g.id === groupId);
    return group ? group.name : '-';
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
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">品牌管理</h1>
          </div>
          <Button onClick={() => { setEditingBrand(null); setFormData({ group_id: '', name: '', sort_order: 0 }); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            新增品牌
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>品牌列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>客戶群組</TableHead>
                  <TableHead>品牌名稱</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>{getGroupName(brand.group_id)}</TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>{brand.sort_order || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(brand)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(brand.id)} className="text-red-600 hover:text-red-700">
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
              <DialogTitle>{editingBrand ? '編輯品牌' : '新增品牌'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="group_id">客戶群組</Label>
                  <Select value={formData.group_id} onValueChange={(value) => setFormData({ ...formData, group_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇客戶群組" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="name">品牌名稱</Label>
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