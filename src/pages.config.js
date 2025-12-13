import Home from './pages/Home';
import Search from './pages/Search';
import Plots from './pages/Plots';
import Services from './pages/Services';
import Admin from './pages/Admin';
import History from './pages/History';
import Visitor from './pages/Visitor';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Search": Search,
    "Plots": Plots,
    "Services": Services,
    "Admin": Admin,
    "History": History,
    "Visitor": Visitor,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};