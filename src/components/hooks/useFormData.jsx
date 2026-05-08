import { useState } from 'react';

export function useFormData() {
  const [projectFormData, setProjectFormData] = useState({
    brand_id: '', season: '', year: new Date().getFullYear(), color: '#3b82f6'
  });
  const [taskFormData, setTaskFormData] = useState({
    name: '', is_important: false, note: '', time_type: '', start_date: '', end_date: ''
  });

  return {
    projectFormData, setProjectFormData,
    taskFormData, setTaskFormData,
  };
}