import React, { useState, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
    Bell, 
    Download, 
    FileText, 
    Users, 
    Upload,
    DollarSign, 
    CheckCircle, 
    AlertTriangle, 
    Database,
    Lock
} from 'lucide-react';
import { motion } from "framer-motion";
import { jsPDF } from "jspdf";
import { format } from 'date-fns';
import { toast } from "sonner";
import OnboardingForm from "@/components/admin/OnboardingForm";
import OnboardingGuide from "@/components/admin/OnboardingGuide";

import EmployeeList from "@/components/admin/EmployeeList";
import OnboardingProgress from "@/components/admin/OnboardingProgress";
import VendorManager from "@/components/admin/VendorManager";
import EventCalendar from "@/components/admin/EventCalendar";
import UserSummaryWidget from "@/components/dashboard/UserSummaryWidget";
import AnnouncementManager from "@/components/admin/AnnouncementManager";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch Data
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list({ limit: 10 }),
    initialData: [],
  });

  const { data: reservations } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => base44.entities.Reservation.list({ limit: 20 }),
    initialData: [],
  });

  const { data: plots } = useQuery({
    queryKey: ['plots-admin'],
    queryFn: () => base44.entities.Plot.list({ limit: 100 }),
    initialData: [],
  });

  // Poll for event reminders every minute
  useQuery({
    queryKey: ['check-reminders'],
    queryFn: () => base44.functions.invoke('checkEventReminders'),
    refetchInterval: 60 * 1000, // Check every minute
    refetchOnWindowFocus: true
  });

  // PDF Generation for Reservation Receipt
  const generateReceipt = (reservation) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(13, 148, 136); // Teal color
    doc.text("Union Springs Cemetery", 105, 20, null, null, "center");
    
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text("Donation & Reservation Receipt", 105, 30, null, null, "center");

    // Content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    let y = 50;
    const lineHeight = 10;

    doc.text(`Date: ${format(new Date(), 'PPP')}`, 20, y);
    y += lineHeight * 2;
    
    doc.text(`Received From: ${reservation.owner_name}`, 20, y);
    y += lineHeight;
    doc.text(`Donation Amount: $${reservation.donation_amount?.toFixed(2)}`, 20, y);
    y += lineHeight;
    doc.text(`For Reservation of Plot ID: ${reservation.plot_id}`, 20, y);
    y += lineHeight * 2;

    doc.setFont("times", "italic");
    doc.text("Thank you for your generous donation. This confirms the reservation", 20, y);
    y += lineHeight;
    doc.text("of the specified plot(s) at Union Springs Cemetery.", 20, y);

    // Footer
    doc.setLineWidth(0.5);
    doc.line(20, 250, 190, 250);
    doc.setFontSize(10);
    doc.text("123 Granite Way, Union Springs, USA", 105, 260, null, null, "center");
    doc.text("This is not a bill of sale. Plots are reserved via donation.", 105, 265, null, null, "center");

    doc.save(`Receipt_${reservation.owner_name.replace(/\s+/g, '_')}.pdf`);
  };

  // Data Export Handler
  const exportData = () => {
    const dataStr = JSON.stringify({ plots, reservations, notifications }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `UnionSprings_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 flex-grow w-full">
      <div className="mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Admin Dashboard</h1>
          <p className="text-stone-600">Administrative Overview & Management</p>
        </div>

        <div className="flex items-center gap-4">
           {/* Bell Alert System */}
           <Popover>
              <PopoverTrigger asChild>
                  <motion.button
                      className="relative p-2 rounded-full hover:bg-stone-100 transition-colors"
                      animate={notifications.some(n => !n.is_read) ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
                      transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }}
                  >
                      <Bell 
                          className={`w-6 h-6 ${notifications.some(n => !n.is_read) ? 'text-red-600 fill-red-100' : 'text-green-600'}`} 
                      />
                      {notifications.some(n => !n.is_read) && (
                          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white" />
                      )}
                  </motion.button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b bg-stone-50">
                      <h4 className="font-semibold text-stone-900">Notifications</h4>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                      {notifications.length === 0 ? (
                          <p className="p-4 text-center text-sm text-stone-500">No new notifications</p>
                      ) : (
                          notifications.map((note) => (
                              <div key={note.id} className={`p-4 border-b last:border-0 hover:bg-stone-50 ${!note.is_read ? 'bg-red-50/50' : ''}`}>
                                  <div className="flex gap-3">
                                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${note.type === 'alert' ? 'text-red-500' : 'text-stone-400'}`} />
                                      <div>
                                          <p className="text-sm text-stone-800">{note.message}</p>
                                          <p className="text-xs text-stone-400 mt-1">{format(new Date(note.created_at), 'MMM d, HH:mm')}</p>
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </PopoverContent>
           </Popover>

           <Button onClick={exportData} variant="outline" className="border-teal-600 text-teal-700 hover:bg-teal-50">
              <Database className="w-4 h-4 mr-2" /> Backup Data
           </Button>
           <Button 
              onClick={async () => {
                  const loadingToastId = toast.loading('Importing data... this may take a minute...');
                  try {
                      const { data } = await base44.functions.invoke('importCemeteryData', {}, { timeout: 60000 });
                      
                      if (data && data.error) {
                          throw new Error(data.error);
                      }

                      toast.success(`Imported ${data.plots_created} plots and ${data.deceased_created} records!`, { id: loadingToastId });
                      queryClient.invalidateQueries({ queryKey: ['plots-admin'] });
                  } catch (err) {
                      console.error("Import error:", err);
                      toast.error(err.message || 'Import failed.', { id: loadingToastId });
                  }
              }} 
              className="bg-stone-800 text-white hover:bg-stone-900"
           >
              <Upload className="w-4 h-4 mr-2" /> Import Legacy Data
           </Button>
        </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 shadow-sm border border-stone-200">
            <TabsTrigger value="overview" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Overview & Reports</TabsTrigger>
            <TabsTrigger value="reservations" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Reservations & Sales</TabsTrigger>
            <TabsTrigger value="plots" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Plot Management</TabsTrigger>
            <TabsTrigger value="onboarding" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Employee Onboarding</TabsTrigger>
            <TabsTrigger value="employees" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Employees</TabsTrigger>
            <TabsTrigger value="vendors" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Vendor Management</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Data & Security</TabsTrigger>
            <TabsTrigger value="bylaws" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Bylaws</TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Event Calendar</TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Announcements</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <UserSummaryWidget />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-stone-500">Total Plots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-stone-900">{plots.length}</div>
                  <p className="text-xs text-stone-500 mt-1">Across all sections</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-stone-500">Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-600">
                    {plots.filter(p => p.status === 'available').length}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">Ready for reservation</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-stone-500">Occupied/Reserved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-stone-700">
                    {plots.filter(p => p.status !== 'available').length}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">Total interments & holds</p>
                </CardContent>
              </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Perpetual Care Report</CardTitle>
                    <CardDescription>Maintenance status overview for grounds keeping.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 bg-stone-50 rounded-sm">
                            <h4 className="font-bold text-stone-800 mb-2">Maintenance Required</h4>
                            <p className="text-stone-600">
                                3 Plots flagged for leveling. <br/>
                                2 Headstones require cleaning in Old Historic section.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white rounded-sm shadow-sm">
                                <span className="block text-sm text-stone-500">Lawn Maintenance</span>
                                <span className="font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Up to Date</span>
                            </div>
                            <div className="p-4 bg-white rounded-sm shadow-sm">
                                <span className="block text-sm text-stone-500">Site Inspections</span>
                                <span className="font-bold text-amber-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Due in 2 days</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>

          {/* RESERVATIONS TAB */}
          <TabsContent value="reservations">
            <Card>
              <CardHeader>
                <CardTitle>Reservation Management</CardTitle>
                <CardDescription>Track donations and generate receipts. Plots are reserved, not sold.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reservations.length === 0 ? (
                    <p className="text-stone-500 italic">No recent reservations.</p>
                  ) : (
                    reservations.map(res => (
                      <div key={res.id} className="flex items-center justify-between p-4 border rounded-sm hover:bg-stone-50">
                        <div>
                          <div className="font-bold text-stone-900">{res.owner_name}</div>
                          <div className="text-sm text-stone-600">Plot: {res.plot_id} • ${res.donation_amount} Donation</div>
                          <div className="text-xs text-stone-400">{format(new Date(res.date), 'MMM d, yyyy')}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={res.status === 'Confirmed' ? 'default' : 'outline'}>{res.status}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => generateReceipt(res)}>
                            <Download className="w-4 h-4" /> Receipt
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white mt-4">
                    <DollarSign className="w-4 h-4 mr-2" /> Record New Donation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PLOTS MANAGEMENT TAB */}
          <TabsContent value="plots">
            <Card>
              <CardHeader>
                <CardTitle>Plot Inventory</CardTitle>
                <CardDescription>Manage capacity (urns/caskets), liners/vaults, and status.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                    <div className="p-4 bg-stone-50 border-b font-medium grid grid-cols-12 gap-2 text-sm text-stone-600">
                        <div className="col-span-2">Location</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Capacity</div>
                        <div className="col-span-2">Occupancy</div>
                        <div className="col-span-2">Last Maint.</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        {plots.map(plot => (
                            <div key={plot.id} className="p-4 border-b grid grid-cols-12 gap-2 items-center text-sm hover:bg-stone-50">
                                <div className="col-span-2 font-medium">{plot.section}-{plot.plot_number}</div>
                                <div className="col-span-2">
                                    <Badge variant="secondary" className={`
                                        ${plot.status === 'available' ? 'bg-green-100 text-green-800' : ''}
                                        ${plot.status === 'reserved' ? 'bg-teal-100 text-teal-800' : ''}
                                        ${plot.status === 'occupied' ? 'bg-red-100 text-red-800' : ''}
                                        ${plot.status === 'unavailable' ? 'bg-gray-100 text-gray-800' : ''}
                                    `}>
                                        {plot.status}
                                    </Badge>
                                </div>
                                <div className="col-span-2">{plot.capacity || 1} slots</div>
                                <div className="col-span-2">{plot.current_occupancy || 0} filled</div>
                                <div className="col-span-2 text-stone-500">
                                    {plot.last_maintained ? format(new Date(plot.last_maintained), 'MMM d') : '-'}
                                </div>
                                <div className="col-span-2 text-right">
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                        <FileText className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONBOARDING TAB */}
          <TabsContent value="onboarding" className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column: New Hire Form */}
                  <div className="xl:col-span-1 space-y-6">
                      <OnboardingForm />
                  </div>

                  {/* Middle Column: Tracker & Docs */}
                  <div className="xl:col-span-1 space-y-6">
                      <OnboardingProgress />
                  </div>

                  {/* Right Column: Guide */}
                  <div className="xl:col-span-1">
                      <OnboardingGuide />
                  </div>
              </div>

          </TabsContent>

          {/* EMPLOYEES TAB */}
          <TabsContent value="employees">
              <EmployeeList />
          </TabsContent>

          {/* VENDORS TAB */}
          <TabsContent value="vendors">
             <VendorManager />
          </TabsContent>

          {/* SECURITY TAB */}
          <TabsContent value="security">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-teal-600"/> Data Security & Archiving
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="prose text-stone-700 space-y-8">
                        <div>
                            <h4 className="font-bold text-lg mb-2 text-stone-900">Data Storage</h4>
                            <p className="leading-relaxed">
                                All cemetery records are securely stored in the cloud database. This ensures redundancy and access from any authorized device.
                            </p>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-lg mb-2 text-stone-900">Backups</h4>
                            <p className="leading-relaxed">
                                It is recommended to perform a manual export (using the "Backup Data" button above) once a month. Save this JSON file to a secure external hard drive or a dedicated organizational cloud storage (e.g., Google Drive, OneDrive).
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold text-lg mb-2 text-stone-900">Restoration</h4>
                            <p className="leading-relaxed">
                                In the event of data loss, the exported JSON file can be used by the technical team to restore the database to its previous state.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold text-lg mb-2 text-stone-900">Access Control</h4>
                            <p className="leading-relaxed">
                                Only authorized administrators should have access to this dashboard. Regularly review who has access credentials.
                            </p>
                        </div>
                    </div>
                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-sm">
                        <strong>Security Tip:</strong> When downloading reports containing personal information (names, donations), 
                        ensure they are stored in encrypted folders on your personal device.
                    </div>
                </CardContent>
             </Card>
          </TabsContent>

          {/* BYLAWS TAB */}
          <TabsContent value="bylaws">
              <Card>
                  <CardHeader>
                      <CardTitle>Cemetery Bylaws</CardTitle>
                      <CardDescription>View and manage the official bylaws and regulations.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-stone-50">
                          <FileText className="w-12 h-12 text-stone-300 mb-4" />
                          <h3 className="text-lg font-semibold text-stone-900 mb-1">Bylaws Repository</h3>
                          <p className="text-stone-500 mb-6 text-center max-w-md">
                              Upload and manage the cemetery's rules, regulations, and bylaws documents here.
                          </p>
                          <Button className="bg-teal-700 hover:bg-teal-800">
                              <Download className="w-4 h-4 mr-2" /> Upload New Bylaws
                          </Button>
                      </div>
                  </CardContent>
              </Card>
          </TabsContent>

          {/* CALENDAR TAB */}
          <TabsContent value="calendar">
              <EventCalendar />
          </TabsContent>

          {/* ANNOUNCEMENTS TAB */}
          <TabsContent value="announcements">
              <AnnouncementManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}