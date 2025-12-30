import AllLeaveCalendar from './pages/AllLeaveCalendar';
import DepartmentManagement from './pages/DepartmentManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import HolidayManagement from './pages/HolidayManagement';
import Home from './pages/Home';
import LeaveCalendar from './pages/LeaveCalendar';
import LeaveTypeManagement from './pages/LeaveTypeManagement';
import Notifications from './pages/Notifications';
import Dashboard from './pages/Dashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AllLeaveCalendar": AllLeaveCalendar,
    "DepartmentManagement": DepartmentManagement,
    "EmployeeManagement": EmployeeManagement,
    "HolidayManagement": HolidayManagement,
    "Home": Home,
    "LeaveCalendar": LeaveCalendar,
    "LeaveTypeManagement": LeaveTypeManagement,
    "Notifications": Notifications,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "LeaveCalendar",
    Pages: PAGES,
    Layout: __Layout,
};