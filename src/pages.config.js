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
import DataImport from './pages/DataImport';
import GanttChart from './pages/GanttChart';
import GanttManagement from './pages/GanttManagement';
import LeaveCalendar from './pages/LeaveCalendar';
import LeaveSettings from './pages/LeaveSettings';
import Notifications from './pages/Notifications';
import PeopleManagement from './pages/PeopleManagement';
import ProjectSettings from './pages/ProjectSettings';
import ReportManagement from './pages/ReportManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AllLeaveCalendar": AllLeaveCalendar,
    "Dashboard": Dashboard,
    "DataImport": DataImport,
    "GanttChart": GanttChart,
    "GanttManagement": GanttManagement,
    "LeaveCalendar": LeaveCalendar,
    "LeaveSettings": LeaveSettings,
    "Notifications": Notifications,
    "PeopleManagement": PeopleManagement,
    "ProjectSettings": ProjectSettings,
    "ReportManagement": ReportManagement,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};