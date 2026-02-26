import GanttChart from './GanttChart';
import MobileGanttChart from '@/components/gantt/MobileGanttChart';

export default function GanttManagement() {
  return (
    <>
      <MobileGanttChart />
      <div className="hidden md:block">
        <GanttChart />
      </div>
    </>
  );
}