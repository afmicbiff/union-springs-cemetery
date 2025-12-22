import Admin from './pages/Admin';
import Bylaws from './pages/Bylaws';
import Contact from './pages/Contact';
import EmployeeProfile from './pages/EmployeeProfile';
import Employees from './pages/Employees';
import History from './pages/History';
import Home from './pages/Home';
import MemberPortal from './pages/MemberPortal';
import Memorial from './pages/Memorial';
import NewPlotDetails from './pages/NewPlotDetails';
import NewPlotReservations from './pages/NewPlotReservations';
import NewPlotsAndMap from './pages/NewPlotsAndMap';
import Plots from './pages/Plots';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Services from './pages/Services';
import Visitor from './pages/Visitor';
import NotificationSettings from './pages/NotificationSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Bylaws": Bylaws,
    "Contact": Contact,
    "EmployeeProfile": EmployeeProfile,
    "Employees": Employees,
    "History": History,
    "Home": Home,
    "MemberPortal": MemberPortal,
    "Memorial": Memorial,
    "NewPlotDetails": NewPlotDetails,
    "NewPlotReservations": NewPlotReservations,
    "NewPlotsAndMap": NewPlotsAndMap,
    "Plots": Plots,
    "Profile": Profile,
    "Search": Search,
    "Services": Services,
    "Visitor": Visitor,
    "NotificationSettings": NotificationSettings,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};