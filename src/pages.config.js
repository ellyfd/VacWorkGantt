/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AllLeaveCalendar from './pages/AllLeaveCalendar';
import Dashboard from './pages/Dashboard';
import DepartmentManagement from './pages/DepartmentManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import GanttManagement from './pages/GanttManagement';
import HolidayManagement from './pages/HolidayManagement';
import Home from './pages/Home';
import LeaveCalendar from './pages/LeaveCalendar';
import LeaveTypeManagement from './pages/LeaveTypeManagement';
import Notifications from './pages/Notifications';
import ProjectManagement from './pages/ProjectManagement';
import ReportManagement from './pages/ReportManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AllLeaveCalendar": AllLeaveCalendar,
    "Dashboard": Dashboard,
    "DepartmentManagement": DepartmentManagement,
    "EmployeeManagement": EmployeeManagement,
    "GanttManagement": GanttManagement,
    "HolidayManagement": HolidayManagement,
    "Home": Home,
    "LeaveCalendar": LeaveCalendar,
    "LeaveTypeManagement": LeaveTypeManagement,
    "Notifications": Notifications,
    "ProjectManagement": ProjectManagement,
    "ReportManagement": ReportManagement,
}

export const pagesConfig = {
    mainPage: "LeaveCalendar",
    Pages: PAGES,
    Layout: __Layout,
};