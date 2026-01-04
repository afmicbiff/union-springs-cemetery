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
import PerformanceDashboard from './pages/PerformanceDashboard';
import Plots from './pages/Plots';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import ResendAck from './pages/ResendAck';
import ReservePlot from './pages/ReservePlot';
import Search from './pages/Search';
import SendEmail from './pages/SendEmail';
import Services from './pages/Services';
import Visitor from './pages/Visitor';
import Admin from './pages/Admin';
import SecurityDashboard from './pages/SecurityDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
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
    "PerformanceDashboard": PerformanceDashboard,
    "Plots": Plots,
    "Profile": Profile,
    "Reports": Reports,
    "ResendAck": ResendAck,
    "ReservePlot": ReservePlot,
    "Search": Search,
    "SendEmail": SendEmail,
    "Services": Services,
    "Visitor": Visitor,
    "Admin": Admin,
    "SecurityDashboard": SecurityDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};