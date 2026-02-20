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
import Admin from './pages/Admin';
import Bylaws from './pages/Bylaws';
import Contact from './pages/Contact';
import EmployeeProfile from './pages/EmployeeProfile';
import Employees from './pages/Employees';
import History from './pages/History';
import Home from './pages/Home';
import ImageGallery from './pages/ImageGallery';
import ImageManager from './pages/ImageManager';
import MemberPortal from './pages/MemberPortal';
import Memorial from './pages/Memorial';
import NewPlotDetails from './pages/NewPlotDetails';
import NewPlotReservations from './pages/NewPlotReservations';
import NewPlotsAndMap from './pages/NewPlotsAndMap';
import NotificationSettings from './pages/NotificationSettings';
import Plots from './pages/Plots';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import ResendAck from './pages/ResendAck';
import ReservePlot from './pages/ReservePlot';
import Search from './pages/Search';
import SecurityDashboard from './pages/SecurityDashboard';
import SendEmail from './pages/SendEmail';
import Services from './pages/Services';
import Visitor from './pages/Visitor';
import Privacy from './pages/Privacy';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Bylaws": Bylaws,
    "Contact": Contact,
    "EmployeeProfile": EmployeeProfile,
    "Employees": Employees,
    "History": History,
    "Home": Home,
    "ImageGallery": ImageGallery,
    "ImageManager": ImageManager,
    "MemberPortal": MemberPortal,
    "Memorial": Memorial,
    "NewPlotDetails": NewPlotDetails,
    "NewPlotReservations": NewPlotReservations,
    "NewPlotsAndMap": NewPlotsAndMap,
    "NotificationSettings": NotificationSettings,
    "Plots": Plots,
    "Profile": Profile,
    "Reports": Reports,
    "ResendAck": ResendAck,
    "ReservePlot": ReservePlot,
    "Search": Search,
    "SecurityDashboard": SecurityDashboard,
    "SendEmail": SendEmail,
    "Services": Services,
    "Visitor": Visitor,
    "Privacy": Privacy,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};