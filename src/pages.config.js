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

// Retry wrapper for dynamic imports — handles transient network/cache failures
function lazyWithRetry(importFn) {
  const component = lazy(() =>
    importFn().catch((err) => {
      // On failure, wait briefly then retry once
      return new Promise((resolve) => setTimeout(resolve, 500))
        .then(() => importFn())
        .catch(() => {
          // Final fallback: reload the page to bust the module cache
          window.location.reload();
          throw err;
        });
    })
  );
  return component;
}

const Admin = lazyWithRetry(() => import('./pages/Admin'));
const Bylaws = lazyWithRetry(() => import('./pages/Bylaws'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const EmployeeProfile = lazyWithRetry(() => import('./pages/EmployeeProfile'));
const Employees = lazyWithRetry(() => import('./pages/Employees'));
const History = lazyWithRetry(() => import('./pages/History'));
const Home = lazyWithRetry(() => import('./pages/Home'));
const ImageGallery = lazyWithRetry(() => import('./pages/ImageGallery'));
const ImageManager = lazyWithRetry(() => import('./pages/ImageManager'));
const MemberPortal = lazyWithRetry(() => import('./pages/MemberPortal'));
const Memorial = lazyWithRetry(() => import('./pages/Memorial'));
const NewPlotDetails = lazyWithRetry(() => import('./pages/NewPlotDetails'));
const NewPlots = lazyWithRetry(() => import('./pages/NewPlots.jsx'));
const NotificationSettings = lazyWithRetry(() => import('./pages/NotificationSettings'));
const OldPlotsAndMap = lazyWithRetry(() => import('./pages/OldPlotsAndMap'));
const Privacy = lazyWithRetry(() => import('./pages/Privacy'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const ResendAck = lazyWithRetry(() => import('./pages/ResendAck'));
const ReservePlot = lazyWithRetry(() => import('./pages/ReservePlot'));
const Search = lazyWithRetry(() => import('./pages/Search'));
const SecurityDashboard = lazyWithRetry(() => import('./pages/SecurityDashboard'));
const SendEmail = lazyWithRetry(() => import('./pages/SendEmail'));
const Services = lazyWithRetry(() => import('./pages/Services'));
const Visitor = lazyWithRetry(() => import('./pages/Visitor'));


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
    "NewPlots": NewPlots,
    "NotificationSettings": NotificationSettings,
    "OldPlotsAndMap": OldPlotsAndMap,

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