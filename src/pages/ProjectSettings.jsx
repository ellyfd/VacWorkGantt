import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Edit2, Trash2, Search } from 'lucide-react';

export default function ProjectSettings() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'groups';
  const [showSampleDialog, setShowSampleDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [sampleFormData, setSampleFormData] = useState({ full_name: '', short_name: '', name: '', project_id: '', status: 'active' });
  const [projectFormData, setProjectFormData] = useState({ full_name: '', short_name: '', group_id: '', status: 'active', default_color: '#3b82f6', categories: [] });
  const [newCategory, setNewCategory] = useState('');
  const [groupFormData, setGroupFormData] = useState({ name: '', status: 'active' });
  const [searchText, setSearchText] = useState('');
  const [projectSearchText, setProjectSearchText] = useState('');
  const [groupSearchText, setGroupSearchText] = useState('');

  // Queries
  const { data: samples = [], isLoading: loadingSamples } = useQuery({
    queryKey: ['samples'],
    queryFn: () => base44.entities.Sample.list('sort_order'),
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('sort_order'),
  });

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list('sort_order'),
  });

  // Mutations
  // Sample Mutations
  const createSample = useMutation({
    mutationFn: (data) => base44.entities.Sample.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['samples']);
      setShowSampleDialog(false);
      setSampleFormData({ full_name: '', short_name: '', name: '', project_id: '', status: 'active' });
    },
  });

  const updateSample = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sample.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['samples']);
      setShowSampleDialog(false);
      setSampleFormData({ full_name: '', short_name: '', name: '', project_id: '', status: 'active' });
      setEditingId(null);
    },
  });

  const deleteSample = useMutation({
    mutationFn: (id) => base44.entities.Sample.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['samples']);
    },
  });

  // Project Mutations
  const createProject = useMutation({
    mutationFn: (data) => {
      const name = data.short_name;
      return base44.entities.Project.create({ ...data, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowProjectDialog(false);
      setProjectFormData({ full_name: '', short_name: '', group_id: '', status: 'active', default_color: '#3b82f6' });
    },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => {
      const name = data.short_name;
      return base44.entities.Project.update(id, { ...data, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowProjectDialog(false);
      setProjectFormData({ full_name: '', short_name: '', group_id: '', status: 'active', default_color: '#3b82f6' });
      setEditingId(null);
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
    },
  });

  // Group Mutations
  const createGroup = useMutation({
    mutationFn: (data) => base44.entities.Group.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setShowGroupDialog(false);
      setGroupFormData({ name: '', status: 'active' });
    },
  });

  const updateGroup = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Group.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setShowGroupDialog(false);
      setGroupFormData({ name: '', status: 'active' });
      setEditingId(null);
    },
  });

  const deleteGroup = useMutation({
    mutationFn: (id) => base44.entities.Group.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
    },
  });

  const handleOpenSampleDialog = (sample = null) => {
    if (sample) {
      setEditingId(sample.id);
      setEditingType('sample');
      setSampleFormData({
        full_name: sample.full_name || '',
        short_name: sample.short_name || '',
        name: sample.name,
        project_id: sample.project_id || '',
      });
    } else {
      setEditingId(null);
      setEditingType('sample');
      setSampleFormData({ full_name: '', short_name: '', name: '', project_id: '', status: 'active' });
    }
    setShowSampleDialog(true);
  };

  const handleSaveSample = () => {
    if (!sampleFormData.name.trim() || !sampleFormData.project_id) return;

    const data = {
      name: sampleFormData.name,
      full_name: sampleFormData.full_name || sampleFormData.name,
      short_name: sampleFormData.short_name || sampleFormData.name,
      project_id: sampleFormData.project_id,
    };

    if (editingId) {
      updateSample.mutate({ id: editingId, data });
    } else {
      createSample.mutate(data);
    }
  };

  const handleOpenProjectDialog = (project = null) => {
    if (project) {
      setEditingId(project.id);
      setEditingType('project');
      setProjectFormData({
        full_name: project.full_name,
        short_name: project.short_name,
        group_id: project.group_id || '',
        status: project.status || 'active',
        default_color: project.default_color || '#3b82f6',
        categories: project.categories || [],
      });
    } else {
      setEditingId(null);
      setEditingType('project');
      setProjectFormData({ full_name: '', short_name: '', group_id: '', status: 'active', default_color: '#3b82f6', categories: [] });
    }
    setNewCategory('');
    setShowProjectDialog(true);
  };

  const handleSaveProject = () => {
    if (!projectFormData.full_name.trim() || !projectFormData.short_name.trim()) return;

    if (editingId) {
      updateProject.mutate({ id: editingId, data: projectFormData });
    } else {
      createProject.mutate(projectFormData);
    }
  };

  const projectMap = new Map(projects.map(p => [p.id, p]));
  const groupMap = new Map(groups.map(g => [g.id, g]));

  const getProjectName = (projectId) => projectMap.get(projectId)?.name || '-';
  const getGroupName = (groupId) => groupMap.get(groupId)?.name || '-';

  const filteredSamples = samples.filter(s => {
    const q = searchText.toLowerCase();
    return s.name?.toLowerCase().includes(q) ||
      s.full_name?.toLowerCase().includes(q) ||
      (projectMap.get(s.project_id)?.name || '').toLowerCase().includes(q);
  });

  const filteredProjects = projects.filter(p => {
    const q = projectSearchText.toLowerCase();
    return p.full_name?.toLowerCase().includes(q) ||
      p.short_name?.toLowerCase().includes(q);
  });

  const filteredGroups = groups.filter(g => {
    const q = groupSearchText.toLowerCase();
    return g.name?.toLowerCase().includes(q);
  });

  const handleOpenGroupDialog = (group = null) => {
    if (group) {
      setEditingId(group.id);
      setEditingType('group');
      setGroupFormData({
        name: group.name,
        status: group.status || 'active',
      });
    } else {
      setEditingId(null);
      setEditingType('group');
      setGroupFormData({ name: '', status: 'active' });
    }
    setShowGroupDialog(true);
  };

  const handleSaveGroup = () => {
    if (!groupFormData.name.trim()) return;

    if (editingId) {
      updateGroup.mutate({ id: editingId, data: groupFormData });
    } else {
      createGroup.mutate(groupFormData);
    }
  };

  const isLoading = loadingSamples || loadingProjects || loadingGroups;

  const usedColors = useMemo(() => {
    return new Set(
      projects
        .filter(p => p.id !== editingId)
        .map(p => p.default_color)
        .filter(Boolean)
    );
  }, [projects, editingId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">專案設定</h1>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="groups">集團管理</TabsTrigger>
          <TabsTrigger value="projects">品牌管理</TabsTrigger>
          <TabsTrigger value="samples">樣品管理</TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">集團列表</h2>
            <Button onClick={() => handleOpenGroupDialog()} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              新增集團
            </Button>
          </div>

          <div className="relative">
            <Input
              placeholder="搜尋集團名稱..."
              value={groupSearchText}
              onChange={(e) => setGroupSearchText(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b whitespace-nowrap">
                    <TableHead className="w-[50%] md:w-[60%]">集團名稱</TableHead>
                    <TableHead className="w-[30%] md:w-[20%]">狀態</TableHead>
                    <TableHead className="w-[20%] md:w-[20%] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                        {groupSearchText ? '未找到匹配的集團' : '沒有集團資料'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGroups.map((group) => (
                      <TableRow key={group.id} className="hover:bg-gray-50 whitespace-nowrap">
                        <TableCell className="font-medium text-sm md:text-base truncate">{group.name}</TableCell>
                        <TableCell className="text-xs md:text-sm">
                          <span className={`px-1.5 md:px-2 py-1 rounded text-[10px] md:text-xs font-medium inline-block ${group.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {group.status === 'active' ? '啟用' : '停用'}
                          </span>
                        </TableCell>
                        <TableCell className="flex gap-0.5 md:gap-2 justify-end flex-shrink-0">
                          <Button variant="ghost" size="icon" className="w-7 h-7 md:w-8 md:h-8" onClick={() => handleOpenGroupDialog(group)}>
                            <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 md:w-8 md:h-8" onClick={() => deleteGroup.mutate(group.id)} disabled={deleteGroup.isPending}>
                            <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">品牌列表</h2>
            <Button onClick={() => handleOpenProjectDialog()} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              新增品牌
            </Button>
          </div>

          <div className="relative">
            <Input
              placeholder="搜尋品牌名稱..."
              value={projectSearchText}
              onChange={(e) => setProjectSearchText(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b whitespace-nowrap">
                    <TableHead className="w-[15%]">品牌縮寫</TableHead>
                    <TableHead className="w-[25%]">品牌全名</TableHead>
                    <TableHead className="w-[15%]">顏色</TableHead>
                    <TableHead className="w-[20%]">集團</TableHead>
                    <TableHead className="w-[15%]">狀態</TableHead>
                    <TableHead className="w-[10%] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        {projectSearchText ? '未找到匹配的品牌' : '沒有品牌資料'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => (
                       <TableRow key={project.id} className="hover:bg-gray-50 whitespace-nowrap">
                         <TableCell className="font-medium text-sm md:text-base truncate">{project.short_name}</TableCell>
                         <TableCell className="text-xs md:text-sm truncate">{project.full_name}</TableCell>
                         <TableCell className="text-xs md:text-sm">
                            {project.default_color ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0"
                                  style={{ backgroundColor: project.default_color }}
                                  title={project.default_color}
                                />
                                <span className="text-gray-500 font-mono text-[11px]">{project.default_color}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                         </TableCell>
                         <TableCell className="text-xs md:text-sm">{getGroupName(project.group_id)}</TableCell>
                         <TableCell className="text-xs md:text-sm">
                          <span className={`px-1.5 md:px-2 py-1 rounded text-[10px] md:text-xs font-medium inline-block ${project.status === 'active' ? 'bg-green-100 text-green-800' : project.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                            {project.status === 'active' ? '進行中' : project.status === 'completed' ? '已完成' : '已存檔'}
                          </span>
                        </TableCell>
                        <TableCell className="flex gap-0.5 md:gap-2 justify-end flex-shrink-0">
                          <Button variant="ghost" size="icon" className="w-7 h-7 md:w-8 md:h-8" onClick={() => handleOpenProjectDialog(project)}>
                            <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 md:w-8 md:h-8" onClick={() => deleteProject.mutate(project.id)} disabled={deleteProject.isPending}>
                            <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Samples Tab */}
        <TabsContent value="samples" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">樣品列表</h2>
            <Button onClick={() => handleOpenSampleDialog()} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              新增樣品
            </Button>
          </div>

          <div className="relative">
            <Input
              placeholder="搜尋樣品名稱或品牌..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b whitespace-nowrap">
                    <TableHead className="w-[30%]">樣品縮寫</TableHead>
                    <TableHead className="w-[35%]">樣品全名</TableHead>
                    <TableHead className="w-[20%]">品牌</TableHead>
                    <TableHead className="w-[15%] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSamples.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                        {searchText ? '未找到匹配的樣品' : '沒有樣品資料'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSamples.map((sample) => (
                      <TableRow key={sample.id} className="hover:bg-gray-50 whitespace-nowrap">
                        <TableCell className="font-medium text-sm md:text-base truncate">{sample.short_name || sample.name}</TableCell>
                        <TableCell className="text-xs md:text-sm truncate">{sample.full_name || sample.name}</TableCell>
                        <TableCell className="text-xs md:text-sm text-gray-600 truncate">
                          {getProjectName(sample.project_id)}
                        </TableCell>
                        <TableCell className="flex gap-0.5 md:gap-2 justify-end flex-shrink-0">
                          <Button variant="ghost" size="icon" className="w-7 h-7 md:w-8 md:h-8" onClick={() => handleOpenSampleDialog(sample)}>
                            <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 md:w-8 md:h-8" onClick={() => deleteSample.mutate(sample.id)} disabled={deleteSample.isPending}>
                            <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sample Dialog */}
      <Dialog open={showSampleDialog} onOpenChange={setShowSampleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId && editingType === 'sample' ? '編輯樣品' : '新增樣品'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>品牌 *</Label>
              <Select
                value={sampleFormData.project_id}
                onValueChange={(v) => setSampleFormData({ ...sampleFormData, project_id: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇品牌..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>樣品全名 *</Label>
              <Input
                value={sampleFormData.full_name}
                onChange={(e) => setSampleFormData({ ...sampleFormData, full_name: e.target.value })}
                placeholder="例：3D Reference Sample"
                className="mt-1"
              />
            </div>
            <div>
              <Label>樣品縮寫 *</Label>
              <Input
                value={sampleFormData.short_name}
                onChange={(e) => setSampleFormData({ ...sampleFormData, short_name: e.target.value })}
                placeholder="例：3DRS"
                className="mt-1"
              />
            </div>
            <div>
              <Label>樣品名稱 *</Label>
              <Input
                value={sampleFormData.name}
                onChange={(e) => setSampleFormData({ ...sampleFormData, name: e.target.value })}
                placeholder="例：3D Reference Sample"
                className="mt-1"
              />
            </div>
            <div>
              <Label>狀態</Label>
              <Select
                value={sampleFormData.status}
                onValueChange={(v) => setSampleFormData({ ...sampleFormData, status: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">啟用</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSampleDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveSample}
              disabled={!sampleFormData.name || !sampleFormData.project_id}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingId && editingType === 'sample' ? '更新' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId && editingType === 'project' ? '編輯品牌' : '新增品牌'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>品牌全名 *</Label>
              <Input
                value={projectFormData.full_name}
                onChange={(e) => setProjectFormData({ ...projectFormData, full_name: e.target.value })}
                placeholder="例：Apple iPhone"
                className="mt-1"
              />
            </div>
            <div>
              <Label>品牌縮寫 *</Label>
              <Input
                value={projectFormData.short_name}
                onChange={(e) => setProjectFormData({ ...projectFormData, short_name: e.target.value })}
                placeholder="例：IP"
                className="mt-1"
              />
            </div>
            <div>
              <Label>集團</Label>
              <Select
                value={projectFormData.group_id}
                onValueChange={(v) => setProjectFormData({ ...projectFormData, group_id: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇集團（非必填）..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>未指定</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 顏色 */}
            <div>
             <Label>甘特圖顏色</Label>
             <div className="mt-2 space-y-2">
               {/* 色票 */}
               <div className="flex gap-2 flex-wrap">
                 {['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#6b7280','#f97316','#84cc16']
                   .filter(color => !usedColors.has(color))
                   .map(color => (
                     <button
                       key={color}
                       type="button"
                       onClick={() => setProjectFormData({ ...projectFormData, default_color: color })}
                       className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                       style={{
                         backgroundColor: color,
                         outline: projectFormData.default_color === color ? `3px solid ${color}` : 'none',
                         outlineOffset: 2,
                       }}
                     />
                   ))}
               </div>
               {usedColors.size >= 10 && (
                 <p className="text-xs text-gray-400">所有預設顏色已被使用，請用 Hex 輸入</p>
               )}
               {/* Hex 輸入 */}
               <div className="flex items-center gap-2">
                 <div className="w-7 h-7 rounded-full border border-gray-200"
                   style={{ backgroundColor: projectFormData.default_color }} />
                 <Input
                   value={projectFormData.default_color}
                   onChange={(e) => {
                     const val = e.target.value;
                     if (/^#[0-9A-Fa-f]{0,6}$/.test(val))
                       setProjectFormData({ ...projectFormData, default_color: val });
                   }}
                   placeholder="#3b82f6"
                   className="h-8 text-sm font-mono w-32"
                   maxLength={7}
                 />
               </div>
             </div>
            </div>

            {/* Categories */}
            <div>
              <Label>Category</Label>
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(projectFormData.categories || []).map((cat, idx) => (
                    <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {cat}
                      <button
                        type="button"
                        onClick={() => setProjectFormData({
                          ...projectFormData,
                          categories: projectFormData.categories.filter((_, i) => i !== idx)
                        })}
                        className="hover:text-red-600 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(projectFormData.categories || []).length === 0 && (
                    <span className="text-xs text-gray-400">尚無 category</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="輸入分類名稱（例: core）"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCategory.trim()) {
                        e.preventDefault();
                        const cat = newCategory.trim();
                        if (!(projectFormData.categories || []).includes(cat)) {
                          setProjectFormData({ ...projectFormData, categories: [...(projectFormData.categories || []), cat] });
                        }
                        setNewCategory('');
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const cat = newCategory.trim();
                      if (cat && !(projectFormData.categories || []).includes(cat)) {
                        setProjectFormData({ ...projectFormData, categories: [...(projectFormData.categories || []), cat] });
                      }
                      setNewCategory('');
                    }}
                    disabled={!newCategory.trim()}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label>狀態</Label>
              <Select
                value={projectFormData.status}
                onValueChange={(v) => setProjectFormData({ ...projectFormData, status: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">進行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="archived">已存檔</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveProject}
              disabled={!projectFormData.full_name || !projectFormData.short_name}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingId && editingType === 'project' ? '更新' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId && editingType === 'group' ? '編輯集團' : '新增集團'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>集團名稱</Label>
              <Input
                value={groupFormData.name}
                onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                placeholder="例：高端品牌"
                className="mt-1"
              />
            </div>
            <div>
              <Label>狀態</Label>
              <Select
                value={groupFormData.status}
                onValueChange={(v) => setGroupFormData({ ...groupFormData, status: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">啟用</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveGroup}
              disabled={!groupFormData.name}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingId && editingType === 'group' ? '更新' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}