import { useState } from 'react';

export function useProjectCreation() {
  const [creatingProjectId, setCreatingProjectId] = useState(null);
  const [projectCreationMode, setProjectCreationMode] = useState('manual');
  const [scheduleFile, setScheduleFile] = useState(null);
  const [isAnalyzingSchedule, setIsAnalyzingSchedule] = useState(false);

  return {
    creatingProjectId, setCreatingProjectId,
    projectCreationMode, setProjectCreationMode,
    scheduleFile, setScheduleFile,
    isAnalyzingSchedule, setIsAnalyzingSchedule,
  };
}