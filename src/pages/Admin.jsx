import React, { useState, useCallback, useMemo, memo, Fragment, useEffect } from 'react';
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
    AlertTriangle,
    FileText,
    Calendar,
    CheckSquare,
    Check,
    Eye,
    X,
    Mail,
    ChevronDown,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import { filterEntity } from "@/components/gov/dataClient";

// Components (lazy-loaded with webpackChunkName for better caching)
// Priority components - likely to be accessed first
const AdminOverview = React.lazy(() => import(/* webpackChunkName: "admin-overview" */ "@/components/admin/AdminOverview.jsx"));
const TaskManager = React.lazy(() => import(/* webpackChunkName: "admin-tasks" */ "@/components/tasks/TaskManager.jsx"));
const MembersDirectory = React.lazy(() => import(/* webpackChunkName: "admin-members" */ "@/components/admin/MembersDirectory.jsx"));

// Secondary components - accessed less frequently
const AdminReservations = React.lazy(() => import(/* webpackChunkName: "admin-reservations" */ "@/components/admin/AdminReservations.jsx"));
const AdminPlots = React.lazy(() => import(/* webpackChunkName: "admin-plots" */ "@/components/admin/AdminPlots.jsx"));
const DeceasedManager = React.lazy(() => import(/* webpackChunkName: "admin-deceased" */ "@/components/admin/DeceasedManager.jsx"));
const EmployeeList = React.lazy(() => import(/* webpackChunkName: "admin-employees" */ "@/components/admin/EmployeeList.jsx"));
const EventCalendar = React.lazy(() => import(/* webpackChunkName: "admin-calendar" */ "@/components/admin/EventCalendar"));

// Tertiary components - rarely accessed
const OnboardingForm = React.lazy(() => import(/* webpackChunkName: "admin-onboarding" */ "@/components/admin/OnboardingForm.jsx"));
const OnboardingProgress = React.lazy(() => import(/* webpackChunkName: "admin-onboarding" */ "@/components/admin/OnboardingProgress.jsx"));
const OnboardingGuide = React.lazy(() => import(/* webpackChunkName: "admin-onboarding" */ "@/components/admin/OnboardingGuide.jsx"));
const VendorManager = React.lazy(() => import(/* webpackChunkName: "admin-vendors" */ "@/components/admin/VendorManager.jsx"));
const AnnouncementManager = React.lazy(() => import(/* webpackChunkName: "admin-announcements" */ "@/components/admin/AnnouncementManager.jsx"));
const BackupManager = React.lazy(() => import(/* webpackChunkName: "admin-backups" */ "@/components/admin/BackupManager.jsx"));
const CommunicationCenter = React.lazy(() => import(/* webpackChunkName: "admin-comms" */ "@/components/admin/CommunicationCenter.jsx"));
const AuditLogViewer = React.lazy(() => import(/* webpackChunkName: "admin-logs" */ "@/components/admin/AuditLogViewer.jsx"));
const LawnCare = React.lazy(() => import(/* webpackChunkName: "admin-lawncare" */ "@/components/admin/LawnCare.jsx"));
const CRM = React.lazy(() => import(/* webpackChunkName: "admin-crm" */ "@/components/crm/CRM.jsx"));
const AdminDocumentsManager = React.lazy(() => import(/* webpackChunkName: "admin-docs" */ "@/components/admin/AdminDocumentsManager.jsx"));

// Keep header essentials eager-loaded
import AdminSearch from "@/components/admin/AdminSearch";
import AdminManual from "@/components/admin/AdminManual";


// Memoized notification item to prevent re-renders
const NotificationItem = memo(function NotificationItem({ 
  note, 
  onNotificationClick, 
  onTaskAction, 
  onEventAction, 
  onMessageAction, 
  onDismiss 
}) {
  const handleClick = useCallback(() => onNotificationClick(note), [onNotificationClick, note]);
  const handleTaskComplete = useCallback((e) => { e.stopPropagation(); onTaskAction(note, 'Completed'); }, [onTaskAction, note]);
  const handleTaskUpdate = useCallback((e) => { e.stopPropagation(); onTaskAction(note, 'Updated'); }, [onTaskAction, note]);
  const handleEventComplete = useCallback((e) => { e.stopPropagation(); onEventAction(note, 'complete'); }, [onEventAction, note]);
  const handleEventUpdate = useCallback((e) => { e.stopPropagation(); onEventAction(note, 'update'); }, [onEventAction, note]);
  const handleMessageView = useCallback((e) => { e.stopPropagation(); onMessageAction(note, 'view'); }, [onMessageAction, note]);
  const handleMessageDismiss = useCallback((e) => { e.stopPropagation(); onMessageAction(note, 'dismiss'); }, [onMessageAction, note]);
  const handleDismiss = useCallback((e) => { e.stopPropagation(); onDismiss(note); }, [onDismiss, note]);

  const isTask = note.related_entity_type === 'task';
  const isMessage = note.related_entity_type === 'message' || note.type === 'message';
  const isEvent = note.related_entity_type === 'event' || (note.message && note.message.toLowerCase().includes('event'));

  return (
    <div className={`p-3 border-b last:border-0 hover:bg-stone-50 ${!note.is_read ? 'bg-red-50/30' : ''}`}>
      <div className="flex gap-3 cursor-pointer" onClick={handleClick}>
        <div className="mt-0.5 shrink-0">
          {isTask ? <CheckSquare className="w-4 h-4 text-blue-500" /> :
           isMessage ? <Mail className="w-4 h-4 text-teal-500" /> :
           <AlertTriangle className={`w-4 h-4 ${note.type === 'alert' ? 'text-red-500' : 'text-stone-400'}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-800 leading-snug line-clamp-2">{note.message}</p>
          <p className="text-[10px] text-stone-400 mt-1">
            {format(new Date(note.created_at), 'MMM d, HH:mm')}
            <span className="ml-2">
              • From {isTask ? 'Tasks' : isMessage ? 'Member Messages' : note.related_entity_type === 'event' ? 'Calendar' : (note.related_entity_type === 'member' || note.related_entity_type === 'document') ? 'Member Directory' : (note.message?.toLowerCase().includes('event') ? 'Calendar' : 'Admin')}
            </span>
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-2 ml-7 flex-wrap">
        {isTask ? (
          <>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-green-700 bg-green-50 border-green-200 hover:bg-green-100 touch-manipulation" onClick={handleTaskComplete}>
              <Check className="w-3 h-3 mr-1" /> Complete
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 touch-manipulation" onClick={handleTaskUpdate}>
              <Eye className="w-3 h-3 mr-1" /> Updated
            </Button>
          </>
        ) : isEvent ? (
          <>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-green-700 bg-green-50 border-green-200 hover:bg-green-100 touch-manipulation" onClick={handleEventComplete}>
              <Check className="w-3 h-3 mr-1" /> Complete
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 touch-manipulation" onClick={handleEventUpdate}>
              <Calendar className="w-3 h-3 mr-1" /> Update
            </Button>
          </>
        ) : isMessage ? (
          <>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100 touch-manipulation" onClick={handleMessageView}>
              <Mail className="w-3 h-3 mr-1" /> View
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-green-700 bg-green-50 border-green-200 hover:bg-green-100 touch-manipulation" onClick={handleMessageDismiss}>
              <Check className="w-3 h-3 mr-1" /> Dismiss
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-stone-600 bg-stone-50 border-stone-200 hover:bg-stone-100 touch-manipulation" onClick={handleDismiss}>
            <X className="w-3 h-3 mr-1" /> Dismiss
          </Button>
        )}
      </div>
    </div>
  );
});

function AdminDashboard() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [initialParams, setInitialParams] = useState({});
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'security') {
        window.location.href = createPageUrl('SecurityDashboard');
        return;
    }
    if (tab) setActiveTab(tab);
    const memberId = params.get('memberId');
    if (memberId) setInitialParams(prev => ({ ...prev, memberId }));
    const showNotifications = params.get('showNotifications');
    if (showNotifications === '1' || showNotifications === 'true') setNotifPopoverOpen(true);
  }, [location.search]);

  // Board member roles that have admin-level access
  const ADMIN_ROLES = ['admin', 'President', 'Vice President', 'Legal', 'Treasurer', 'Secretary', 'Caretaker', 'Administrator'];

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!mounted) return;
        if (!user) {
          base44.auth.redirectToLogin(window.location.pathname);
          return;
        }
        // Check if user has admin or board member role
        if (!ADMIN_ROLES.includes(user.role)) {
          window.location.href = '/';
          return;
        }
        setIsAuthorized(true);
      } catch {
        if (!mounted) return;
        base44.auth.redirectToLogin(window.location.pathname);
      }
    };
    checkAuth();
    return () => { mounted = false; };
  }, []);



  // Notifications for Header - fetch ALL notifications (both read and unread) for display
  // The bell badge will show count of unread ones
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: ({ signal }) => filterEntity(
      'Notification',
      {}, // Fetch all - we'll filter unread in UI for badge
      { sort: '-created_at', limit: 30, select: ['id','message','type','is_read','related_entity_type','related_entity_id','link','created_at'] },
      { signal }
    ),
    initialData: [],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000, // Check every minute
  });

  // Count unread for badge - memoized
  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  const dismissibleNotes = useMemo(() => notifications.filter(note => !(note?.related_entity_type === 'task' || note?.related_entity_type === 'message' || note?.related_entity_type === 'event' || (note?.message && note.message.toLowerCase().includes('event')))), [notifications]);

  const dismissAllNotifications = useCallback(async () => {
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
  }, [dismissibleNotes, queryClient]);

  const updateTaskStatus = useCallback(async (note, status) => {
      if (!note.related_entity_id) return;
      try {
          if (status === 'Completed') {
              const res = await base44.functions.invoke('updateTaskStatus', { id: note.related_entity_id, status: 'Completed' });
              if (res.data.error) throw new Error(res.data.error);
          }
          await base44.entities.Notification.update(note.id, { is_read: true });
          queryClient.invalidateQueries(['notifications']);
          queryClient.invalidateQueries(['tasks']);
          toast.success(status === 'Completed' ? "Task Completed" : "Notification updated");
      } catch (err) {
          if (err.message && (err.message.includes("not found") || err.message.includes("404"))) {
               await base44.entities.Notification.update(note.id, { is_read: true });
               queryClient.invalidateQueries(['notifications']);
               toast.error("Task not found. Notification cleared.");
          } else {
               toast.error("Action failed: " + err.message);
          }
      }
  }, [queryClient]);

  const handleEventAction = useCallback(async (note, action) => {
    await base44.entities.Notification.update(note.id, { is_read: true });
    queryClient.invalidateQueries(['notifications']);
    if (action === 'complete') {
      toast.success("Event notification marked as complete");
    } else {
      setActiveTab('calendar');
      setNotifPopoverOpen(false);
    }
  }, [queryClient]);

  const handleMessageAction = useCallback(async (note, action) => {
    await base44.entities.Notification.update(note.id, { is_read: true });
    queryClient.invalidateQueries(['notifications']);
    if (action === 'view') {
      setActiveTab('communication');
      setNotifPopoverOpen(false);
    } else {
      toast.success("Message notification dismissed");
    }
  }, [queryClient]);

  const handleDismiss = useCallback(async (note) => {
    try {
      await base44.entities.Notification.delete(note.id);
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
      toast.error("Failed to dismiss notification");
    }
  }, [queryClient]);

  const handleNotificationClick = useCallback(async (note) => {
       if (!note.is_read) {
           try {
               await base44.entities.Notification.update(note.id, { is_read: true });
               queryClient.invalidateQueries(['notifications']);
           } catch (err) { /* silent */ }
       }
       if (note.link) {
           window.location.href = note.link; 
       } else if (note.related_entity_type === 'message' || note.type === 'message') {
           setActiveTab('communication');
           setNotifPopoverOpen(false);
       } else if (note.related_entity_type === 'task') {
           setActiveTab('tasks');
           setNotifPopoverOpen(false);
       } else if (note.related_entity_type === 'event' || (note.message && note.message.toLowerCase().includes('event'))) {
           setActiveTab('calendar');
           setNotifPopoverOpen(false);
       } else if (note.related_entity_type === 'member' || note.related_entity_type === 'document') {
           setActiveTab('members');
           setNotifPopoverOpen(false);
       }
  }, [queryClient]);

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

  // Keep hook order stable: avoid returning before all hooks are declared. Use a guarded render block instead.
  const notAuthorizedView = (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
  );

  const handleSearchNavigate = useCallback((link) => {
      if (link.type === 'security') {
          window.location.href = createPageUrl('SecurityDashboard');
          return;
      }
      const tabMap = {
          member: 'members', plot: 'plots', reservation: 'reservations', employee: 'employees',
          vendor: 'vendors', task: 'tasks', announcement: 'announcements', overview: 'overview',
          onboarding: 'onboarding', calendar: 'calendar', reservations: 'reservations', plots: 'plots',
          employees: 'employees', vendors: 'vendors', tasks: 'tasks', announcements: 'announcements', members: 'members'
      };
      if (tabMap[link.type]) setActiveTab(tabMap[link.type]);
  }, []);

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

  // Memoize tabs to prevent recreation on every render
  const tabs = useMemo(() => [
      { id: "overview", label: "Overview", component: <AdminOverview /> },
      { id: "deceased", label: "Deceased", component: <DeceasedManager /> },
      { id: "reservations", label: "Sales", component: <AdminReservations /> },
      { id: "plots", label: "Plots", component: <AdminPlots /> },
      { id: "lawncare", label: "Lawn Care", component: <LawnCare /> },
      { id: "crm", label: "CRM", component: <CRM /> },
      { id: "onboarding", label: "Onboarding", component: (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-4 md:space-y-6"><OnboardingForm /></div>
              <div className="space-y-4 md:space-y-6"><OnboardingProgress /></div>
              <div className="lg:col-span-2 xl:col-span-1"><OnboardingGuide /></div>
          </div>
      )},
      { id: "tasks", label: "Tasks", component: <TaskManager isAdmin={true} /> },
      { id: "archives", label: "Archives", component: <EmployeeList view="archived" /> },
      { id: "vendors", label: "Vendors", component: <VendorManager /> },
      { id: "calendar", label: "Calendar", component: <EventCalendar /> },
      { id: "announcements", label: "News", component: <AnnouncementManager /> },
      { id: "employees", label: "Employees", component: <EmployeeList view="active" /> },
      { id: "members", label: "Members", component: <MembersDirectory openMemberId={initialParams.memberId} /> },
      { id: "documents", label: "Documents", component: <AdminDocumentsManager /> },
      { id: "communication", label: "Communications", component: <CommunicationCenter /> },
      { id: "logs", label: "System Logs", component: <AuditLogViewer /> },
      { id: "backups", label: "Backups", component: <BackupManager /> },
  ], [initialParams.memberId]);

  if (!isAuthorized) {
    return notAuthorizedView;
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 w-full max-w-[1600px] mx-auto">
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 sm:gap-4">
            <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-stone-900">Admin Dashboard</h1>
                <p className="text-stone-600 text-xs sm:text-sm md:text-base">Administrative Overview & Management</p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 self-end md:self-auto w-full md:w-auto justify-end flex-wrap">
                <AdminSearch onNavigate={handleSearchNavigate} />
                
                {/* Notifications */}
                <Popover open={notifPopoverOpen} onOpenChange={setNotifPopoverOpen}>
                    <PopoverTrigger asChild>
                        <button
                            className="relative p-2 rounded-full hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <Bell className={`w-5 h-5 md:w-6 md:h-6 ${unreadCount > 0 ? 'text-red-600 fill-red-50' : 'text-stone-500'}`} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[90vw] sm:w-80 max-w-[360px] p-0" align="end">
                        <div className="p-3 border-b bg-stone-50 flex items-center justify-between">
                            <h4 className="font-semibold text-stone-900 text-sm">
                                Notifications {unreadCount > 0 && <span className="text-red-600">({unreadCount} unread)</span>}
                            </h4>
                            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 text-stone-700" disabled={dismissibleNotes.length === 0} onClick={dismissAllNotifications}>
                              Dismiss All
                            </Button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto overscroll-contain">
                            {notifications.length === 0 ? (
                                <p className="p-4 text-center text-sm text-stone-500">No new notifications</p>
                            ) : (
                                notifications.map((note) => (
                                    <NotificationItem 
                                      key={note.id}
                                      note={note}
                                      onNotificationClick={handleNotificationClick}
                                      onTaskAction={updateTaskStatus}
                                      onEventAction={handleEventAction}
                                      onMessageAction={handleMessageAction}
                                      onDismiss={handleDismiss}
                                    />
                                ))
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>

        {/* Navigation & Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <div className="w-full overflow-x-auto pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0 scrollbar-hide overscroll-x-contain">
                <TabsList className="bg-white p-1 shadow-sm border border-stone-200 flex flex-wrap h-auto w-full gap-0.5 sm:gap-1">
                    {tabs.map(tab => {
                      // Keep invisible triggers for tabs that are in dropdowns to maintain Tabs structure
                      if (tab.id === 'archives' || tab.id === 'onboarding' || tab.id === 'documents') {
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
                        const isEmployeesGroupActive = activeTab === 'employees' || activeTab === 'archives' || activeTab === 'onboarding';
                        return (
                          <div key="employees-group" className="flex items-stretch">
                            <TabsTrigger 
                              value="employees"
                              className={`
                                px-2 sm:px-3 py-2 text-[10px] sm:text-xs md:text-[11px] lg:text-xs font-medium 
                                data-[state=active]:bg-teal-700 data-[state=active]:text-white
                                hover:text-green-700 hover:bg-green-50 touch-manipulation
                                flex flex-col md:flex-row items-center gap-1 md:gap-1 md:justify-center
                                min-w-[60px] sm:min-w-[80px] md:min-w-0
                                ${isEmployeesGroupActive && activeTab !== 'employees' ? 'bg-teal-700 text-white' : ''}
                              `}
                            >
                              <div className="whitespace-nowrap flex items-center gap-1">
                                <span className="hidden sm:inline">Employees</span>
                                <span className="sm:hidden">Emp</span>
                              </div>
                            </TabsTrigger>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className={`px-1.5 sm:px-2 py-2 text-[10px] sm:text-xs md:text-[11px] lg:text-xs font-medium border-l border-stone-200 rounded-none rounded-r-md flex items-center hover:bg-green-50 touch-manipulation min-h-[44px] ${isEmployeesGroupActive ? 'bg-teal-700 text-white hover:bg-teal-700' : ''}`}
                                  aria-label="Employees options"
                                >
                                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="min-w-[160px]">
                                <DropdownMenuItem onClick={() => setActiveTab('employees')} className="min-h-[44px] sm:min-h-0">Employees</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setActiveTab('onboarding')} className="min-h-[44px] sm:min-h-0">Onboarding</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setActiveTab('archives')} className="min-h-[44px] sm:min-h-0">Archives</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                        }
                        if (tab.id === 'communication') {
                          const isCommActive = activeTab === 'communication';
                          return (
                            <Fragment key="email-comm-group">
                              {/* Email Tool - moved to left of Communications */}
                              <div className="hidden sm:flex items-stretch">
                                <Link
                                  to={createPageUrl('SendEmail')}
                                  className="px-2 sm:px-3 py-2 text-[10px] sm:text-xs md:text-[11px] lg:text-xs font-medium hover:text-green-700 hover:bg-green-50 flex items-center justify-center gap-1.5 min-w-[60px] sm:min-w-[80px] touch-manipulation min-h-[44px] sm:min-h-0"
                                >
                                  <span className="hidden md:inline">Email Tool</span>
                                  <span className="md:hidden">Email</span>
                                </Link>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="px-1.5 sm:px-2 py-2 text-[10px] sm:text-xs md:text-[11px] lg:text-xs font-medium border-l border-stone-200 rounded-none rounded-r-md flex items-center hover:bg-green-50 touch-manipulation min-h-[44px] sm:min-h-0"
                                      aria-label="Email tool options"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="min-w-[200px]">
                                    <DropdownMenuItem asChild className="min-h-[44px] sm:min-h-0">
                                      <Link to={createPageUrl('SendEmail')} className="flex items-center">
                                        <Mail className="w-4 h-4 mr-2" /> Open Send Email
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="min-h-[44px] sm:min-h-0">
                                      <Link to={`${createPageUrl('SendEmail')}#templates-section`} className="flex items-center">
                                        <FileText className="w-4 h-4 mr-2" /> Templates
                                      </Link>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Communications */}
                              <div className="flex items-stretch">
                                <TabsTrigger 
                                  value="communication"
                                  className={`
                                    px-2 sm:px-3 py-2 text-[10px] sm:text-xs md:text-[11px] lg:text-xs font-medium 
                                    data-[state=active]:bg-teal-700 data-[state=active]:text-white
                                    hover:text-green-700 hover:bg-green-50 touch-manipulation
                                    flex flex-col md:flex-row items-center gap-1 md:gap-1 md:justify-center
                                    min-w-[60px] sm:min-w-[80px] md:min-w-0
                                    ${isCommActive ? 'bg-teal-700 text-white' : ''}
                                  `}
                                >
                                  <div className="whitespace-nowrap flex items-center gap-1">
                                    <span className="hidden sm:inline">Communications</span>
                                    <span className="sm:hidden">Comms</span>
                                  </div>
                                </TabsTrigger>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className={`px-1.5 sm:px-2 py-2 text-[10px] sm:text-xs md:text-[11px] lg:text-xs font-medium border-l border-stone-200 rounded-none rounded-r-md flex items-center hover:bg-green-50 touch-manipulation min-h-[44px] ${isCommActive ? 'bg-teal-700 text-white hover:bg-teal-700' : ''}`}
                                      aria-label="Communications options"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="min-w-[160px]">
                                    <DropdownMenuItem onClick={() => setActiveTab('communication')} className="min-h-[44px] sm:min-h-0">Open</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </Fragment>
                          );
                        }

                        return (
                        <TabsTrigger 
                          key={tab.id} 
                          value={tab.id} 
                          className={`
                            px-2 sm:px-3 py-2 text-[10px] sm:text-xs md:text-[11px] lg:text-xs font-medium 
                            data-[state=active]:bg-teal-700 data-[state=active]:text-white
                            hover:text-green-700 hover:bg-green-50 touch-manipulation
                            flex flex-col md:flex-row items-center gap-1 md:gap-1 md:justify-center
                            min-w-[50px] sm:min-w-[70px] md:min-w-0 min-h-[44px] sm:min-h-0
                            ${tab.id === 'communication' ? 'ml-2 sm:ml-4 md:ml-0 md:col-span-2 px-3 sm:px-6' : ''}
                          `}
                        >
                          <div className="whitespace-nowrap flex items-center gap-1">
                            {tab.label}
                            {tab.id === 'communication' && (<ChevronDown className="w-3 h-3 opacity-70" />)}
                          </div>
                        </TabsTrigger>
                      );
                    })}

                    {/* Action buttons - hidden on small mobile, visible on sm+ */}
                    <Link
                        to={createPageUrl('NewPlotReservations')}
                        className="hidden sm:flex px-3 sm:px-6 py-2 text-[10px] sm:text-xs md:text-[11px] lg:text-xs font-medium hover:text-green-700 hover:bg-green-50 items-center justify-center gap-1.5 min-w-[60px] sm:min-w-[80px] touch-manipulation min-h-[44px] sm:min-h-0"
                    >
                        <span className="hidden md:inline">New Plot Reservation</span>
                        <span className="md:hidden">New Plot</span>
                    </Link>

                    <Link
                        to={createPageUrl('Bylaws')}
                        className="hidden md:flex px-6 py-2 text-xs md:text-[11px] lg:text-xs font-medium hover:text-green-700 hover:bg-green-50 items-center justify-center gap-1.5 min-w-[80px] touch-manipulation"
                    >
                        Bylaws
                    </Link>

                    <TabsTrigger 
                      value="documents"
                      className="hidden md:flex px-2 sm:px-3 py-2 text-[10px] sm:text-xs md:text-[11px] lg:text-xs font-medium data-[state=active]:bg-teal-700 data-[state=active]:text-white hover:text-green-700 hover:bg-green-50 touch-manipulation items-center justify-center min-w-[50px] sm:min-w-[70px] md:min-w-0 min-h-[44px] sm:min-h-0"
                    >
                      Documents
                    </TabsTrigger>

                    <div className="hidden md:flex items-center ml-2">
                      <AdminManual currentTab={activeTab} />
                    </div>
                </TabsList>
            </div>

            {tabs.filter(t => t.id !== 'security').map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="focus-visible:outline-none">
                    <React.Suspense fallback={<div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>}>
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {tab.component}
                        </div>
                    </React.Suspense>
                </TabsContent>
            ))}
        </Tabs>

      </div>
    </div>
  );
}

export default AdminDashboard;