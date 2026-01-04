import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
    Archive,
    Check,
    Eye,
    X,
    Plus,
    Mail,
    Settings,
    ChevronDown
} from 'lucide-react';
import { motion } from "framer-motion";
import { format } from 'date-fns';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import { filterEntity } from "@/components/gov/dataClient";

// Components (lazy-loaded to reduce initial bundle)
const AdminOverview = React.lazy(() => import("@/components/admin/AdminOverview.jsx"));
const AdminReservations = React.lazy(() => import("@/components/admin/AdminReservations.jsx"));
const AdminPlots = React.lazy(() => import("@/components/admin/AdminPlots.jsx"));
const DeceasedManager = React.lazy(() => import("@/components/admin/DeceasedManager.jsx"));
const OnboardingForm = React.lazy(() => import("@/components/admin/OnboardingForm.jsx"));
const OnboardingProgress = React.lazy(() => import("@/components/admin/OnboardingProgress.jsx"));
const OnboardingGuide = React.lazy(() => import("@/components/admin/OnboardingGuide.jsx"));
const EmployeeList = React.lazy(() => import("@/components/admin/EmployeeList.jsx"));
const VendorManager = React.lazy(() => import("@/components/admin/VendorManager"));
const AdminSecurity = React.lazy(() => import("@/components/admin/AdminSecurity.jsx"));
const EventCalendar = React.lazy(() => import("@/components/admin/EventCalendar.jsx"));
const AnnouncementManager = React.lazy(() => import("@/components/admin/AnnouncementManager.jsx"));
const TaskManager = React.lazy(() => import("@/components/tasks/TaskManager.jsx"));
const MembersDirectory = React.lazy(() => import("@/components/admin/MembersDirectory.jsx"));

const BackupManager = React.lazy(() => import("@/components/admin/BackupManager.jsx"));
const CommunicationCenter = React.lazy(() => import("@/components/admin/CommunicationCenter.jsx"));
const AuditLogViewer = React.lazy(() => import("@/components/admin/AuditLogViewer.jsx"));
const LawnCare = React.lazy(() => import("@/components/admin/LawnCare.jsx"));
const CRM = React.lazy(() => import("@/components/crm/CRM.jsx"));
const AdminDocumentsManager = React.lazy(() => import("@/components/admin/AdminDocumentsManager.jsx"));

// Keep header essentials eager-loaded
import AdminSearch from "@/components/admin/AdminSearch";
import DataImportDialog from "@/components/admin/DataImportDialog";


export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [initialParams, setInitialParams] = useState({});
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'security') {
        window.location.href = createPageUrl('SecurityDashboard');
        return;
    }
    if (tab) {
        setActiveTab(tab);
    }
    const memberId = params.get('memberId');
    if (memberId) {
        setInitialParams(prev => ({ ...prev, memberId }));
    }
    const showNotifications = params.get('showNotifications');
    if (showNotifications === '1' || showNotifications === 'true') {
        setNotifPopoverOpen(true);
    }
  }, [location.search]);

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
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: ({ signal }) => filterEntity(
      'Notification',
      { is_read: false },
      { sort: '-created_at', limit: 20, select: ['id','message','type','is_read','related_entity_type','related_entity_id','link','created_at'] },
      { signal }
    ),
    initialData: [],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 120_000,
  });

  const dismissibleNotes = React.useMemo(() => notifications.filter(note => !(note?.related_entity_type === 'task' || note?.related_entity_type === 'message' || note?.related_entity_type === 'event' || (note?.message && note.message.toLowerCase().includes('event')))), [notifications]);

  const dismissAllNotifications = async () => {
    try {
      const user = await base44.auth.me().catch(() => null);
      await Promise.all(dismissibleNotes.map(async (note) => {
        await base44.entities.Notification.delete(note.id);
        if (user?.email) {
          await base44.entities.AuditLog.create({
            action: 'dismiss',
            entity_type: 'Notification',
            entity_id: note.id,
            details: `Notification dismissed: "${note.message || ''}"`,
            performed_by: user.email,
            timestamp: new Date().toISOString()
          });
        }
      }));
      queryClient.invalidateQueries(['notifications']);
      toast.success('Dismissed all notifications');
    } catch (err) {
      toast.error('Failed to dismiss all');
    }
  };

  const updateTaskStatus = async (note, status) => {
      if (!note.related_entity_id) return;
      try {
          // Call backend function to handle recurrence and audit logs
          if (status === 'Completed') {
              const res = await base44.functions.invoke('updateTaskStatus', { 
                  id: note.related_entity_id, 
                  status: 'Completed' 
              });
              if (res.data.error) throw new Error(res.data.error);
          } else {
               // Just mark as updated/viewed manually if not completing
               // Or potentially just navigate to it. 
               // For "Update" button which usually implies acknowledging:
               // We'll keeps existing logic but just add a note if needed, 
               // but mostly we just want to clear the notification.
               // If the user meant "Update" as in "I'm working on it", we might set to In Progress?
               // The previous logic didn't change status unless 'Completed'.
               // It just added a note. We'll stick to that for non-complete actions or just mark read.
          }

          // Mark Notification Read
          await base44.entities.Notification.update(note.id, { is_read: true });
          
          queryClient.invalidateQueries(['notifications']);
          queryClient.invalidateQueries(['tasks']);
          
          if (status === 'Completed') {
              toast.success("Task Completed");
          } else {
              toast.success("Notification updated");
          }
      } catch (err) {
          // If task not found (404), clear notification
          if (err.message && (err.message.includes("not found") || err.message.includes("404"))) {
               await base44.entities.Notification.update(note.id, { is_read: true });
               queryClient.invalidateQueries(['notifications']);
               toast.error("Task not found. Notification cleared.");
          } else {
               toast.error("Action failed: " + err.message);
          }
      }
  };

  const handleNotificationClick = async (note) => {
       // Mark as read
       if (!note.is_read) {
           await base44.entities.Notification.update(note.id, { is_read: true });
           queryClient.invalidateQueries(['notifications']);
       }

       // Navigate if link exists
       if (note.link) {
           window.location.href = note.link; 
       } else if (note.related_entity_type === 'message') {
           setActiveTab('communication');
       } else if (note.related_entity_type === 'task') {
           setActiveTab('tasks');
       } else if (note.related_entity_type === 'event' || (note.message && note.message.toLowerCase().includes('event'))) {
           setActiveTab('calendar');
       } else if (note.related_entity_type === 'member' || note.related_entity_type === 'document') {
           setActiveTab('members');
       }
  };

  // Background polling for reminders (batched)
  useQueries({
    queries: [
      {
        queryKey: ['check-reminders'],
        queryFn: () => base44.functions.invoke('checkEventReminders'),
        refetchInterval: 300_000, // 5 minutes
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['check-doc-expirations'],
        queryFn: () => base44.functions.invoke('checkDocumentExpirations'),
        refetchInterval: 900_000, // 15 minutes
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['check-member-reminders'],
        queryFn: () => base44.functions.invoke('checkMemberReminders'),
        refetchInterval: 600_000, // 10 minutes
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['check-task-due-dates'],
        queryFn: () => base44.functions.invoke('checkTaskDueDates'),
        refetchInterval: 600_000, // 10 minutes
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['run-crm-automations'],
        queryFn: () => base44.functions.invoke('runCrmAutomations'),
        refetchInterval: 900_000, // 15 minutes
        refetchOnWindowFocus: false,
      },
    ]
  });

  if (!isAuthorized) {
      return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  }

  const handleSearchNavigate = (link) => {
      // Redirect security results to the dedicated page
      if (link.type === 'security') {
          window.location.href = createPageUrl('SecurityDashboard');
          return;
      }
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
        const res = await base44.functions.invoke('exportAdminData', {});
        const blob = new Blob([res.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UnionSprings_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
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
{ id: "lawncare", label: "Lawn Care", component: <LawnCare /> },
{ id: "crm", label: "CRM", component: <CRM /> },
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
      { id: "calendar", label: "Calendar", component: <EventCalendar /> },
      { id: "announcements", label: "News", component: <AnnouncementManager /> },
      { id: "tasks", label: "Tasks", component: <TaskManager isAdmin={true} /> },
      { id: "members", label: "Members", component: <MembersDirectory openMemberId={initialParams.memberId} /> },
      { id: "documents", label: "Documents", component: <AdminDocumentsManager /> },

      { id: "backups", label: "Backups", component: <BackupManager /> },
      { id: "communication", label: "Communications", component: <CommunicationCenter /> },
      { id: "logs", label: "System Logs", component: <AuditLogViewer /> },
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
                <Popover open={notifPopoverOpen} onOpenChange={setNotifPopoverOpen}>
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
                        <div className="p-3 border-b bg-stone-50 flex items-center justify-between">
                            <h4 className="font-semibold text-stone-900 text-sm">Notifications</h4>
                            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 text-stone-700" disabled={dismissibleNotes.length === 0} onClick={dismissAllNotifications}>
                              Dismiss All
                            </Button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <p className="p-4 text-center text-sm text-stone-500">No new notifications</p>
                            ) : (
                                notifications.map((note) => (
                                    <div key={note.id} className={`p-3 border-b last:border-0 hover:bg-stone-50 ${!note.is_read ? 'bg-red-50/30' : ''}`}>
                                        <div 
                                          className="flex gap-3 cursor-pointer"
                                          onClick={() => handleNotificationClick(note)}
                                        >
                                            <div className="mt-0.5 shrink-0">
                                                {note.related_entity_type === 'task' ? <CheckSquare className="w-4 h-4 text-blue-500" /> :
                                                 note.related_entity_type === 'message' ? <Megaphone className="w-4 h-4 text-teal-500" /> :
                                                 <AlertTriangle className={`w-4 h-4 ${note.type === 'alert' ? 'text-red-500' : 'text-stone-400'}`} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-stone-800 leading-snug">{note.message}</p>
                                                <p className="text-[10px] text-stone-400 mt-1">
                                                    {format(new Date(note.created_at), 'MMM d, HH:mm')}
                                                    <span className="ml-2">
                                                        • From {
                                                            note.related_entity_type === 'task' ? 'Tasks' :
                                                            note.related_entity_type === 'message' ? 'Communications' :
                                                            note.related_entity_type === 'event' ? 'Calendar' :
                                                            (note.related_entity_type === 'member' || note.related_entity_type === 'document') ? 'Member Directory' :
                                                            (note.message.toLowerCase().includes('event') ? 'Calendar' : 'Admin')
                                                        }
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Unified Action Buttons */}
                                        <div className="flex gap-2 mt-2 ml-7">
                                            {note.related_entity_type === 'task' ? (
                                                <>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-6 text-[10px] px-2 text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                                                        onClick={(e) => { e.stopPropagation(); updateTaskStatus(note, 'Completed'); }}
                                                    >
                                                        <Check className="w-3 h-3 mr-1" /> Complete Task
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-6 text-[10px] px-2 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                                                        onClick={(e) => { e.stopPropagation(); updateTaskStatus(note, 'Updated'); }}
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" /> Updated
                                                    </Button>
                                                </>
                                            ) : (note.related_entity_type === 'event' || note.message.toLowerCase().includes('event')) ? (
                                                <>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-6 text-[10px] px-2 text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                                                        onClick={async (e) => { 
                                                            e.stopPropagation(); 
                                                            await base44.entities.Notification.update(note.id, { is_read: true });
                                                            queryClient.invalidateQueries(['notifications']);
                                                            toast.success("Event notification marked as complete");
                                                        }}
                                                    >
                                                        <Check className="w-3 h-3 mr-1" /> Complete
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-6 text-[10px] px-2 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                                                        onClick={async (e) => { 
                                                            e.stopPropagation(); 
                                                            await base44.entities.Notification.update(note.id, { is_read: true });
                                                            queryClient.invalidateQueries(['notifications']);
                                                            setActiveTab('calendar');
                                                        }}
                                                    >
                                                        <Calendar className="w-3 h-3 mr-1" /> Update
                                                    </Button>
                                                </>
                                            ) : note.related_entity_type === 'message' ? (
                                                <>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-6 text-[10px] px-2 text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                                                        onClick={async (e) => { 
                                                            e.stopPropagation(); 
                                                            await base44.entities.Notification.update(note.id, { is_read: true });
                                                            queryClient.invalidateQueries(['notifications']);
                                                            toast.success("Message marked as read");
                                                        }}
                                                    >
                                                        <Check className="w-3 h-3 mr-1" /> Complete
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-6 text-[10px] px-2 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                                                        onClick={async (e) => { 
                                                            e.stopPropagation(); 
                                                            await base44.entities.Notification.update(note.id, { is_read: true });
                                                            queryClient.invalidateQueries(['notifications']);
                                                            setActiveTab('communication');
                                                        }}
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" /> Update
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-6 text-[10px] px-2 text-stone-600 bg-stone-50 border-stone-200 hover:bg-stone-100"
                                                    onClick={async (e) => { 
                                                        e.stopPropagation(); 
                                                        try {
                                                            await base44.entities.Notification.delete(note.id);
                                                            
                                                            // Audit Log
                                                            const user = await base44.auth.me();
                                                            await base44.entities.AuditLog.create({
                                                                action: 'dismiss',
                                                                entity_type: 'Notification',
                                                                entity_id: note.id,
                                                                details: `Notification dismissed: "${note.message}"`,
                                                                performed_by: user.email,
                                                                timestamp: new Date().toISOString()
                                                            });

                                                            queryClient.invalidateQueries(['notifications']);
                                                            toast.success("Notification dismissed");
                                                        } catch (err) {
                                                            console.error("Failed to dismiss:", err);
                                                            toast.error("Failed to dismiss notification");
                                                        }
                                                    }}
                                                >
                                                    <X className="w-3 h-3 mr-1" /> Dismiss
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </PopoverContent>
                </Popover>



                <Button 
                    onClick={() => setActiveTab('backups')} 
                    variant="outline" 
                    size="sm" 
                    className="hidden md:flex border-teal-600 text-teal-700 hover:bg-teal-50"
                >
                    <Database className="w-4 h-4 mr-2" /> Backups
                </Button>
                
                <DataImportDialog />
            </div>
        </div>

        {/* Navigation & Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <TabsList className="bg-white p-1 shadow-sm border border-stone-200 flex flex-wrap h-auto w-full gap-1">
                    {tabs.map(tab => {
                      // Keep an invisible Archives trigger to maintain Tabs structure and avoid hook/order issues
                      if (tab.id === 'archives') {
                        return (
                          <TabsTrigger 
                            key={tab.id}
                            value={tab.id}
                            className="hidden"
                            aria-hidden="true"
                            tabIndex={-1}
                          >
                            {tab.label}
                          </TabsTrigger>
                        );
                      }

                      if (tab.id === 'employees') {
                        const isEmployeesGroupActive = activeTab === 'employees' || activeTab === 'archives';
                        return (
                          <div key="employees-group" className="flex items-stretch">
                            <TabsTrigger 
                              value="employees"
                              className={`
                                px-3 py-2 text-xs md:text-[11px] lg:text-xs font-medium 
                                data-[state=active]:bg-teal-700 data-[state=active]:text-white
                                hover:text-green-700 hover:bg-green-50
                                flex flex-col md:flex-row items-center gap-1.5 md:gap-1 md:justify-center
                                min-w-[80px] md:min-w-0
                                ${isEmployeesGroupActive && activeTab === 'archives' ? 'bg-teal-700 text-white' : ''}
                              `}
                            >
                              <div className="whitespace-nowrap flex items-center gap-1">Employees</div>
                            </TabsTrigger>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className={`px-2 py-2 text-xs md:text-[11px] lg:text-xs font-medium border-l border-stone-200 rounded-none rounded-r-md flex items-center hover:bg-green-50 ${isEmployeesGroupActive ? 'bg-teal-700 text-white hover:bg-teal-700' : ''}`}
                                  aria-label="Employees options"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="min-w-[160px]">
                                <DropdownMenuItem onClick={() => setActiveTab('employees')}>Employees</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setActiveTab('archives')}>Archives</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                        }
                        if (tab.id === 'communication') {
                          const isCommActive = activeTab === 'communication';
                          return (
                            <div key="communication-group" className="flex items-stretch">
                              <TabsTrigger 
                                value="communication"
                                className={`
                                  px-3 py-2 text-xs md:text-[11px] lg:text-xs font-medium 
                                  data-[state=active]:bg-teal-700 data-[state=active]:text-white
                                  hover:text-green-700 hover:bg-green-50
                                  flex flex-col md:flex-row items-center gap-1.5 md:gap-1 md:justify-center
                                  min-w-[80px] md:min-w-0
                                  ${isCommActive ? 'bg-teal-700 text-white' : ''}
                                `}
                              >
                                <div className="whitespace-nowrap flex items-center gap-1">Communications</div>
                              </TabsTrigger>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className={`px-2 py-2 text-xs md:text-[11px] lg:text-xs font-medium border-l border-stone-200 rounded-none rounded-r-md flex items-center hover:bg-green-50 ${isCommActive ? 'bg-teal-700 text-white hover:bg-teal-700' : ''}`}
                                    aria-label="Communications options"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="min-w-[160px]">
                                  <DropdownMenuItem onClick={() => setActiveTab('communication')}>Open</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          );
                        }

                        return (
                        <TabsTrigger 
                          key={tab.id} 
                          value={tab.id} 
                          className={`
                            px-3 py-2 text-xs md:text-[11px] lg:text-xs font-medium 
                            data-[state=active]:bg-teal-700 data-[state=active]:text-white
                            hover:text-green-700 hover:bg-green-50
                            flex flex-col md:flex-row items-center gap-1.5 md:gap-1 md:justify-center
                            min-w-[80px] md:min-w-0
                            ${tab.id === 'communication' ? 'ml-4 md:ml-0 md:col-span-2 px-6' : ''}
                          `}
                        >
                          <div className="whitespace-nowrap flex items-center gap-1">
                            {tab.label}
                            {tab.id === 'communication' && (<ChevronDown className="w-3 h-3 opacity-70" />)}
                          </div>
                        </TabsTrigger>
                      );
                    })}

                    {/* Action button beside System Logs */}
                    <Link
                        to={createPageUrl('NewPlotReservations')}
                        className="px-6 py-2 text-xs md:text-[11px] lg:text-xs font-medium hover:text-green-700 hover:bg-green-50 flex items-center justify-center gap-1.5 min-w-[80px]"
                    >
                        New Plot Reservation
                    </Link>

                    <Link
                        to={createPageUrl('Bylaws')}
                        className="px-6 py-2 text-xs md:text-[11px] lg:text-xs font-medium hover:text-green-700 hover:bg-green-50 flex items-center justify-center gap-1.5 min-w-[80px]"
                    >
                        Bylaws
                    </Link>

                    <div className="flex items-stretch">
                      <button
                        className="px-3 py-2 text-xs md:text-[11px] lg:text-xs font-medium hover:text-green-700 hover:bg-green-50 flex items-center justify-center gap-1.5 min-w-[80px]"
                        onClick={() => setNotifPopoverOpen(true)}
                      >
                        <Bell className="w-4 h-4" /> Notifications
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="px-2 py-2 text-xs md:text-[11px] lg:text-xs font-medium border-l border-stone-200 rounded-none rounded-r-md flex items-center hover:bg-green-50"
                            aria-label="Notifications options"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[200px]">
                          <DropdownMenuItem onClick={() => setNotifPopoverOpen(true)}>
                            <Bell className="w-4 h-4 mr-2" /> Open Notifications
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('NotificationSettings')} className="flex items-center">
                              <Settings className="w-4 h-4 mr-2" /> Notification Settings
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-stretch">
                      <Link
                        to={createPageUrl('SendEmail')}
                        className="px-3 py-2 text-xs md:text-[11px] lg:text-xs font-medium hover:text-green-700 hover:bg-green-50 flex items-center justify-center gap-1.5 min-w-[80px]"
                      >
                        <Mail className="w-4 h-4" /> Email Tool
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="px-2 py-2 text-xs md:text-[11px] lg:text-xs font-medium border-l border-stone-200 rounded-none rounded-r-md flex items-center hover:bg-green-50"
                            aria-label="Email tool options"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[200px]">
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('SendEmail')} className="flex items-center">
                              <Mail className="w-4 h-4 mr-2" /> Open Send Email
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`${createPageUrl('SendEmail')}#templates-section`} className="flex items-center">
                              <FileText className="w-4 h-4 mr-2" /> Templates
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                </TabsList>
            </div>

            {tabs.filter(t => t.id !== 'security').map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="focus-visible:outline-none">
                    <React.Suspense fallback={<div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>}>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {tab.component}
                        </motion.div>
                    </React.Suspense>
                </TabsContent>
            ))}
        </Tabs>

      </div>
    </div>
  );
}