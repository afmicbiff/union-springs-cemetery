import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
    Bell, 
    Upload, 
    Database,
    AlertTriangle,
    LayoutDashboard,
    DollarSign,
    Map,
    UserPlus,
    Users,
    Truck,
    Shield,
    FileText,
    Calendar,
    Megaphone,
    CheckSquare,
    Archive
} from 'lucide-react';
import { motion } from "framer-motion";
import { format } from 'date-fns';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

// Components
import AdminOverview from "@/components/admin/AdminOverview";
import AdminReservations from "@/components/admin/AdminReservations";
import AdminPlots from "@/components/admin/AdminPlots";
import DeceasedManager from "@/components/admin/DeceasedManager";
import OnboardingForm from "@/components/admin/OnboardingForm";
import OnboardingProgress from "@/components/admin/OnboardingProgress";
import OnboardingGuide from "@/components/admin/OnboardingGuide";
import EmployeeList from "@/components/admin/EmployeeList";
import VendorManager from "@/components/admin/VendorManager";
import AdminSecurity from "@/components/admin/AdminSecurity";
import EventCalendar from "@/components/admin/EventCalendar";
import AnnouncementManager from "@/components/admin/AnnouncementManager";
import TaskManager from "@/components/tasks/TaskManager";
import MembersDirectory from "@/components/admin/MembersDirectory";
import AdminSearch from "@/components/admin/AdminSearch";
import AdminBylaws from "@/components/admin/AdminBylaws";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAuthorized, setIsAuthorized] = useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }
      if (user.role !== 'admin') {
        window.location.href = '/';
        return;
      }
      setIsAuthorized(true);
    };
    checkAuth();
  }, []);

  // Notifications for Header
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list({ limit: 10 }),
    initialData: [],
  });

  // Background polling for reminders
  useQuery({
    queryKey: ['check-reminders'],
    queryFn: () => base44.functions.invoke('checkEventReminders'),
    refetchInterval: 60 * 1000, 
    refetchOnWindowFocus: true
  });

  useQuery({
    queryKey: ['check-doc-expirations'],
    queryFn: () => base44.functions.invoke('checkDocumentExpirations'),
    refetchInterval: 300 * 1000, // Check every 5 minutes
    refetchOnWindowFocus: false
  });

  useQuery({
      queryKey: ['check-member-reminders'],
      queryFn: () => base44.functions.invoke('checkMemberReminders'),
      refetchInterval: 120 * 1000, // Check every 2 minutes
      refetchOnWindowFocus: false
  });

  if (!isAuthorized) {
      return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  }

  const handleSearchNavigate = (link) => {
      // Map search result types to tabs
      const tabMap = {
          member: 'members',
          plot: 'plots',
          reservation: 'reservations',
          employee: 'employees',
          vendor: 'vendors',
          task: 'tasks',
          announcement: 'announcements',
          // Navigation types map directly or via aliases
          overview: 'overview',
          onboarding: 'onboarding',
          security: 'security',
          bylaws: 'bylaws',
          calendar: 'calendar',
          reservations: 'reservations',
          plots: 'plots',
          employees: 'employees',
          vendors: 'vendors',
          tasks: 'tasks',
          announcements: 'announcements',
          members: 'members'
      };

      if (tabMap[link.type]) {
          setActiveTab(tabMap[link.type]);
      }
  };

  // On-Demand Data Export
  const exportData = async () => {
    const toastId = toast.loading("Preparing backup...");
    try {
        const [plots, reservations, allNotes] = await Promise.all([
            base44.entities.Plot.list({ limit: 1000 }),
            base44.entities.Reservation.list({ limit: 1000 }),
            base44.entities.Notification.list({ limit: 1000 })
        ]);

        const dataStr = JSON.stringify({ plots, reservations, notifications: allNotes }, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `UnionSprings_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Backup downloaded successfully", { id: toastId });
    } catch (error) {
        toast.error("Backup failed: " + error.message, { id: toastId });
    }
  };

  const tabs = [
      { id: "overview", label: "Overview", component: <AdminOverview /> },
      { id: "deceased", label: "Deceased", component: <DeceasedManager /> },
      { id: "reservations", label: "Sales", component: <AdminReservations /> },
      { id: "plots", label: "Plots", component: <AdminPlots /> },
      { id: "onboarding", label: "Onboarding", component: (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-1 space-y-6"><OnboardingForm /></div>
              <div className="xl:col-span-1 space-y-6"><OnboardingProgress /></div>
              <div className="xl:col-span-1"><OnboardingGuide /></div>
          </div>
      )},
      { id: "employees", label: "Employees", component: <EmployeeList view="active" /> },
      { id: "archives", label: "Archives", component: <EmployeeList view="archived" /> },
      { id: "vendors", label: "Vendors", component: <VendorManager /> },
      { id: "security", label: "Security", component: <AdminSecurity /> },
      { id: "calendar", label: "Calendar", component: <EventCalendar /> },
      { id: "announcements", label: "News", component: <AnnouncementManager /> },
      { id: "tasks", label: "Tasks", component: <TaskManager isAdmin={true} /> },
      { id: "members", label: "Members", component: <MembersDirectory /> },
      { id: "bylaws", label: "Bylaws", component: <AdminBylaws /> },
  ];

  return (
    <div className="p-4 md:p-6 w-full max-w-[1600px] mx-auto">
      <div className="space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900">Admin Dashboard</h1>
                <p className="text-stone-600 text-sm md:text-base">Administrative Overview & Management</p>
            </div>

            <div className="flex items-center gap-2 md:gap-4 self-end md:self-auto w-full md:w-auto justify-end">
                <AdminSearch onNavigate={handleSearchNavigate} />
                
                {/* Notifications */}
                <Popover>
                    <PopoverTrigger asChild>
                        <motion.button
                            className="relative p-2 rounded-full hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200"
                            animate={notifications.some(n => !n.is_read) ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
                            transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }}
                        >
                            <Bell className={`w-5 h-5 md:w-6 md:h-6 ${notifications.some(n => !n.is_read) ? 'text-red-600 fill-red-50' : 'text-stone-500'}`} />
                            {notifications.some(n => !n.is_read) && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white" />
                            )}
                        </motion.button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                        <div className="p-3 border-b bg-stone-50">
                            <h4 className="font-semibold text-stone-900 text-sm">Notifications</h4>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <p className="p-4 text-center text-sm text-stone-500">No new notifications</p>
                            ) : (
                                notifications.map((note) => (
                                    <div key={note.id} className={`p-3 border-b last:border-0 hover:bg-stone-50 ${!note.is_read ? 'bg-red-50/30' : ''}`}>
                                        <div className="flex gap-3">
                                            <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${note.type === 'alert' ? 'text-red-500' : 'text-stone-400'}`} />
                                            <div>
                                                <p className="text-sm text-stone-800 leading-snug">{note.message}</p>
                                                <p className="text-[10px] text-stone-400 mt-1">{format(new Date(note.created_at), 'MMM d, HH:mm')}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                <Button onClick={exportData} variant="outline" size="sm" className="hidden md:flex border-teal-600 text-teal-700 hover:bg-teal-50">
                    <Database className="w-4 h-4 mr-2" /> Backup
                </Button>
                
                <Button 
                    size="sm"
                    onClick={async () => {
                        const loadingToastId = toast.loading('Importing data...');
                        try {
                            const { data } = await base44.functions.invoke('importCemeteryData', {}, { timeout: 60000 });
                            if (data?.error) throw new Error(data.error);
                            toast.success(`Imported ${data.plots_created} plots`, { id: loadingToastId });
                            queryClient.invalidateQueries({ queryKey: ['plots-admin-list'] });
                            queryClient.invalidateQueries({ queryKey: ['plots-admin'] });
                        } catch (err) {
                            toast.error(err.message || 'Import failed', { id: loadingToastId });
                        }
                    }} 
                    className="bg-stone-800 text-white hover:bg-stone-900"
                >
                    <Upload className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Import Legacy</span>
                </Button>
            </div>
        </div>

        {/* Navigation & Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <TabsList className="bg-white p-1 shadow-sm border border-stone-200 inline-flex h-auto w-max md:w-full md:grid md:grid-cols-6 lg:grid-cols-12 gap-1">
                    {tabs.map(tab => (
                        <TabsTrigger 
                            key={tab.id} 
                            value={tab.id} 
                            className="
                                px-3 py-2 text-xs md:text-[11px] lg:text-xs font-medium 
                                data-[state=active]:bg-teal-700 data-[state=active]:text-white
                                hover:text-green-700 hover:bg-green-50
                                flex flex-col md:flex-row items-center gap-1.5 md:gap-1 md:justify-center
                                min-w-[80px] md:min-w-0
                            "
                        >
                            <span className="whitespace-nowrap">{tab.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>

            {tabs.map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="focus-visible:outline-none">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {tab.component}
                    </motion.div>
                </TabsContent>
            ))}
        </Tabs>
      </div>
    </div>
  );
}