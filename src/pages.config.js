import AllLeaveCalendar from './pages/AllLeaveCalendar';
import Dashboard from './pages/Dashboard';
import DepartmentManagement from './pages/DepartmentManagement';
import HolidayManagement from './pages/HolidayManagement';
import Home from './pages/Home';
import LeaveCalendar from './pages/LeaveCalendar';
import LeaveTypeManagement from './pages/LeaveTypeManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AllLeaveCalendar": AllLeaveCalendar,
    "Dashboard": Dashboard,
    "DepartmentManagement": DepartmentManagement,
    "HolidayManagement": HolidayManagement,
    "Home": Home,
    "LeaveCalendar": LeaveCalendar,
    "LeaveTypeManagement": LeaveTypeManagement,
    "EmployeeManagement": EmployeeManagement,
}

export const pagesConfig = {
    mainPage: "LeaveCalendar",
    Pages: PAGES,
    Layout: __Layout,
};