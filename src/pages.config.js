import Home from './pages/Home';
import Search from './pages/Search';
import Plots from './pages/Plots';
import Services from './pages/Services';
import Admin from './pages/Admin';
import History from './pages/History';
import Visitor from './pages/Visitor';
import Contact from './pages/Contact';
import EmployeeProfile from './pages/EmployeeProfile';
import Memorial from './pages/Memorial';
import Profile from './pages/Profile';
import Employees from './pages/Employees';
import MemberProfile from './pages/MemberProfile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Search": Search,
    "Plots": Plots,
    "Services": Services,
    "Admin": Admin,
    "History": History,
    "Visitor": Visitor,
    "Contact": Contact,
    "EmployeeProfile": EmployeeProfile,
    "Memorial": Memorial,
    "Profile": Profile,
    "Employees": Employees,
    "MemberProfile": MemberProfile,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};