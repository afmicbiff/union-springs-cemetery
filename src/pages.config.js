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
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const Admin = lazy(() => import('./pages/Admin'));
const Bylaws = lazy(() => import('./pages/Bylaws'));
const Contact = lazy(() => import('./pages/Contact'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const Employees = lazy(() => import('./pages/Employees'));
const History = lazy(() => import('./pages/History'));
const Home = lazy(() => import('./pages/Home'));
const ImageGallery = lazy(() => import('./pages/ImageGallery'));
const ImageManager = lazy(() => import('./pages/ImageManager'));
const MemberPortal = lazy(() => import('./pages/MemberPortal'));
const Memorial = lazy(() => import('./pages/Memorial'));
const NewPlotDetails = lazy(() => import('./pages/NewPlotDetails'));
const NewPlotReservations = lazy(() => import('./pages/NewPlotReservations'));
const NewPlotsAndMap = lazy(() => import('./pages/NewPlotsAndMap'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const Plots = lazy(() => import('./pages/Plots.jsx'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Profile = lazy(() => import('./pages/Profile'));
const Reports = lazy(() => import('./pages/Reports'));
const ResendAck = lazy(() => import('./pages/ResendAck'));
const ReservePlot = lazy(() => import('./pages/ReservePlot'));
const Search = lazy(() => import('./pages/Search'));
const SecurityDashboard = lazy(() => import('./pages/SecurityDashboard'));
const SendEmail = lazy(() => import('./pages/SendEmail'));
const Services = lazy(() => import('./pages/Services'));
const Visitor = lazy(() => import('./pages/Visitor'));


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
    "Privacy": Privacy,
    "Profile": Profile,
    "Reports": Reports,
    "ResendAck": ResendAck,
    "ReservePlot": ReservePlot,
    "Search": Search,
    "SecurityDashboard": SecurityDashboard,
    "SendEmail": SendEmail,
    "Services": Services,
    "Visitor": Visitor,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};