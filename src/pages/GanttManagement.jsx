import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, BarChart3, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GanttManagement() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: clientGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => base44.entities.ClientGroup.list('sort_order'),
  });

  const { data: brands = [], isLoading: loadingBrands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => base44.entities.Brand.list('sort_order'),
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects', selectedYear],
    queryFn: () => base44.entities.Project.filter({ year: selectedYear }),
  });

  const { data: phases = [], isLoading: loadingPhases } = useQuery({
    queryKey: ['phases'],
    queryFn: () => base44.entities.Phase.list('sort_order'),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('sort_order'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('name'),
  });

  const isLoading = loadingGroups || loadingBrands || loadingProjects || loadingPhases || loadingTasks;

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
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">專案甘特圖</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value={2025}>2025年</option>
              <option value={2026}>2026年</option>
              <option value={2027}>2027年</option>
            </select>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-5 h-5 mr-2" />
              新增專案
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>專案總覽</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientGroups.map((group) => {
                const groupBrands = brands.filter(b => b.group_id === group.id);
                return (
                  <div key={group.id} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-bold text-lg text-gray-800 mb-2">{group.name}</h3>
                    {groupBrands.map((brand) => {
                      const brandProjects = projects.filter(p => p.brand_id === brand.id);
                      return (
                        <div key={brand.id} className="ml-4 mb-3">
                          <h4 className="font-semibold text-gray-700 mb-1">{brand.name}</h4>
                          <div className="ml-4 space-y-1">
                            {brandProjects.map((project) => {
                              const projectPhases = phases.filter(p => p.project_id === project.id);
                              return (
                                <div key={project.id} className="text-sm text-gray-600">
                                  {project.season} {project.year} - {projectPhases.length} 個階段
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 功能說明</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• 此頁面用於管理專案的階段（Phase）和任務（Task）</p>
            <p>• 每個專案可包含多個階段（3D Proto / 3D LA / 3D JSS / 3D RS）</p>
            <p>• 每個階段可包含多個子任務</p>
            <p>• 支援時間區間（duration）和里程碑（milestone）兩種時間類型</p>
          </div>
        </div>
      </div>
    </div>
  );
}