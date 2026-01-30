import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, BarChart3, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarHeader from '@/components/calendar/CalendarHeader';
import ProjectTree from '@/components/gantt/ProjectTree';
import GanttTimeline from '@/components/gantt/GanttTimeline';

export default function GanttManagement() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expanded, setExpanded] = useState(['group-0', 'brand-0', 'project-0']);

  const { data: clientGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => base44.entities.ClientGroup.list('sort_order'),
  });

  const { data: brands = [], isLoading: loadingBrands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => base44.entities.Brand.list('sort_order'),
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-year'),
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">專案甘特圖</h1>
          </div>
          <div className="flex items-center gap-3">
            <CalendarHeader currentDate={currentDate} onDateChange={setCurrentDate} />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>設定管理</SheetTitle>
                </SheetHeader>
                <Tabs defaultValue="groups" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="groups">客戶群組</TabsTrigger>
                    <TabsTrigger value="brands">品牌</TabsTrigger>
                  </TabsList>
                  <TabsContent value="groups" className="mt-4">
                    <p className="text-xs text-gray-500 mb-4">進入「設定管理 → 客戶群組管理」建立客戶群組</p>
                    <div className="space-y-2">
                      {clientGroups.map((group) => (
                        <div key={group.id} className="p-2 bg-gray-50 rounded text-sm">
                          {group.name}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="brands" className="mt-4">
                    <p className="text-xs text-gray-500 mb-4">進入「設定管理 → 品牌管理」建立品牌</p>
                    <div className="space-y-2">
                      {brands.map((brand) => (
                        <div key={brand.id} className="p-2 bg-gray-50 rounded text-sm">
                          {brand.name}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <ProjectTree 
          clientGroups={clientGroups}
          brands={brands}
          projects={projects}
          phases={phases}
          tasks={tasks}
          expanded={expanded}
          setExpanded={setExpanded}
        />
        <GanttTimeline 
          currentDate={currentDate}
          clientGroups={clientGroups}
          brands={brands}
          projects={projects}
          phases={phases}
          tasks={tasks}
          employees={employees}
        />
      </div>
    </div>
  );
}