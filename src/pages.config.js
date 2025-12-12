import LeaveCalendar from './pages/LeaveCalendar';
import EmployeeManagement from './pages/EmployeeManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import LeaveTypeManagement from './pages/LeaveTypeManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "LeaveCalendar": LeaveCalendar,
    "EmployeeManagement": EmployeeManagement,
    "DepartmentManagement": DepartmentManagement,
    "LeaveTypeManagement": LeaveTypeManagement,
}

export const pagesConfig = {
    mainPage: "LeaveCalendar",
    Pages: PAGES,
    Layout: __Layout,
};