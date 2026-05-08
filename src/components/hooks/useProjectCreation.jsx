import { useState } from 'react';

export function useProjectCreation() {
  const [creatingProjectId, setCreatingProjectId] = useState(null);
  const [scheduleFile, setScheduleFile] = useState(null);
  const [isAnalyzingSchedule, setIsAnalyzingSchedule] = useState(false);

  return {
    creatingProjectId, setCreatingProjectId,
    scheduleFile, setScheduleFile,
    isAnalyzingSchedule, setIsAnalyzingSchedule,
  };
}