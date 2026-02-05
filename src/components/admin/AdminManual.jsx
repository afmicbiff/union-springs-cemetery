import React, { memo, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  BookOpen, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  Map, 
  Megaphone, 
  CheckSquare, 
  Database,
  Bell,
  Mail,
  Search,
  Shield,
  Truck,
  UserPlus,
  Archive,
  Leaf,
  MessageSquare,
  HelpCircle,
  ChevronRight,
  Phone,
  MousePointer,
  Eye,
  Plus,
  Save,
  Trash2,
  Edit,
  Filter
} from 'lucide-react';

const ManualSection = memo(function ManualSection({ icon: Icon, title, children }) {
  return (
    <AccordionItem value={title} className="border rounded-lg mb-2 bg-white">
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-stone-50 rounded-t-lg">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Icon className="w-5 h-5 text-teal-700" />
          </div>
          <span className="font-semibold text-stone-800 text-base">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="prose prose-stone max-w-none text-base leading-relaxed">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});

const Step = memo(function Step({ number, children }) {
  return (
    <div className="flex gap-3 my-3">
      <div className="flex-shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="flex-1 pt-1 text-stone-700">{children}</div>
    </div>
  );
});

const Tip = memo(function Tip({ children }) {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-3 my-3 rounded-r-lg">
      <div className="flex items-start gap-2">
        <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-amber-800 text-sm"><strong>Helpful Tip:</strong> {children}</div>
      </div>
    </div>
  );
});

const ButtonGuide = memo(function ButtonGuide({ label, icon: Icon, description }) {
  return (
    <div className="flex items-start gap-3 my-2 p-2 bg-stone-50 rounded-lg">
      <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded text-sm font-medium text-stone-700">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </div>
      <ChevronRight className="w-4 h-4 text-stone-400 mt-1.5 flex-shrink-0" />
      <span className="text-stone-600 text-sm">{description}</span>
    </div>
  );
});

const AdminManual = memo(function AdminManual({ currentTab }) {
  const [open, setOpen] = useState(false);
  const [defaultSection, setDefaultSection] = useState('');

  const handleOpen = useCallback((isOpen) => {
    setOpen(isOpen);
    if (isOpen && currentTab) {
      // Map tab names to manual sections
      const tabToSection = {
        'overview': 'Overview Dashboard',
        'deceased': 'Deceased Records',
        'reservations': 'Sales & Reservations',
        'plots': 'Plot Management',
        'lawncare': 'Lawn Care',
        'crm': 'CRM (Customer Relations)',
        'onboarding': 'Onboarding New Members',
        'employees': 'Employee Management',
        'archives': 'Employee Archives',
        'vendors': 'Vendor Management',
        'calendar': 'Calendar & Events',
        'announcements': 'News & Announcements',
        'tasks': 'Task Management',
        'members': 'Member Directory',
        'documents': 'Document Management',
        'backups': 'Backups & Data Safety',
        'communication': 'Communications Center',
        'logs': 'System Logs',
      };
      setDefaultSection(tabToSection[currentTab] || '');
    }
  }, [currentTab]);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-teal-600 text-teal-700 hover:bg-teal-50">
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">How-To Manual</span>
          <span className="sm:hidden">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2 border-b bg-stone-50">
          <DialogTitle className="text-2xl font-serif flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-teal-700" />
            Admin Dashboard Manual
          </DialogTitle>
          <p className="text-stone-600 mt-2">
            Welcome! This guide explains how to use each section of the Admin Dashboard. 
            Click any section below to expand the instructions.
          </p>
        </DialogHeader>
        
        <ScrollArea className="h-[65vh] px-6 py-4">
          <Accordion type="single" collapsible defaultValue={defaultSection} className="space-y-1">
            
            {/* GETTING STARTED */}
            <ManualSection icon={HelpCircle} title="Getting Started - Read This First">
              <p className="text-lg mb-4">
                Welcome to the Union Springs Cemetery Admin Dashboard. This system helps you manage 
                all cemetery operations from one central location.
              </p>
              
              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Navigate</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Tabs at the top:</strong> Click any tab (Overview, Deceased, Sales, etc.) to switch between sections</li>
                <li><strong>Search bar:</strong> Type to quickly find members, plots, employees, or any record</li>
                <li><strong>Bell icon:</strong> Shows your notifications - click to see alerts and reminders</li>
              </ul>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Common Actions on Every Page</h4>
              <ButtonGuide icon={Plus} label="Add New" description="Creates a new record (member, task, event, etc.)" />
              <ButtonGuide icon={Edit} label="Edit" description="Opens the record so you can make changes" />
              <ButtonGuide icon={Save} label="Save" description="Saves your changes - ALWAYS click this when done!" />
              <ButtonGuide icon={Trash2} label="Delete" description="Removes the record permanently - use with caution" />
              <ButtonGuide icon={Filter} label="Filter" description="Narrows down the list to show only what you need" />

              <Tip>
                If you make a mistake, look for an "Undo" option or check the System Logs tab 
                to see recent changes. When in doubt, ask before deleting anything!
              </Tip>
            </ManualSection>

            {/* OVERVIEW */}
            <ManualSection icon={LayoutDashboard} title="Overview Dashboard">
              <p>
                The Overview is your home base. It shows a summary of everything happening 
                at Union Springs Cemetery at a glance.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">What You'll See</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Quick Stats:</strong> Total plots, available plots, recent reservations, upcoming tasks</li>
                <li><strong>Recent Activity:</strong> Latest changes made by any administrator</li>
                <li><strong>Upcoming Events:</strong> Calendar events happening soon</li>
                <li><strong>Task Summary:</strong> Tasks that need attention</li>
                <li><strong>News Preview:</strong> Recent announcements</li>
              </ul>

              <Tip>
                Check the Overview each time you log in to see if anything needs your 
                immediate attention. Red or orange items usually mean something is urgent!
              </Tip>
            </ManualSection>

            {/* DECEASED */}
            <ManualSection icon={Users} title="Deceased Records">
              <p>
                This section stores information about individuals who are interred (buried) 
                at Union Springs Cemetery.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Add a New Deceased Record</h4>
              <Step number="1">Click the <strong>"Add Deceased"</strong> button at the top right</Step>
              <Step number="2">Fill in the person's information:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>First Name & Last Name:</strong> The person's full legal name</li>
                  <li><strong>Date of Birth:</strong> Click the calendar icon and select the date</li>
                  <li><strong>Date of Death:</strong> Click the calendar icon and select the date</li>
                  <li><strong>Plot Location:</strong> Select which plot they are buried in</li>
                  <li><strong>Veteran Status:</strong> Check this box if the person served in the military</li>
                </ul>
              </Step>
              <Step number="3">Click <strong>"Save"</strong> to store the record</Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Search for a Record</h4>
              <Step number="1">Use the search box at the top of the page</Step>
              <Step number="2">Type any part of the person's name</Step>
              <Step number="3">Press Enter or click the magnifying glass</Step>

              <Tip>
                You can search by first name, last name, or plot number. 
                The search is not case-sensitive, so "Smith" and "smith" will find the same results.
              </Tip>
            </ManualSection>

            {/* SALES & RESERVATIONS */}
            <ManualSection icon={DollarSign} title="Sales & Reservations">
              <p>
                Manage plot sales, reservations, and payments. This is where you track 
                who has purchased or reserved burial plots.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Create a New Reservation</h4>
              <Step number="1">Click <strong>"New Reservation"</strong> button</Step>
              <Step number="2">Select the plot(s) being reserved from the dropdown</Step>
              <Step number="3">Enter the buyer's information:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Name:</strong> Person making the reservation</li>
                  <li><strong>Phone:</strong> Best number to reach them</li>
                  <li><strong>Email:</strong> For sending confirmations</li>
                  <li><strong>Address:</strong> Mailing address for documents</li>
                </ul>
              </Step>
              <Step number="4">Enter payment information:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Amount:</strong> Total price of the reservation</li>
                  <li><strong>Payment Status:</strong> Paid, Pending, or Partial</li>
                  <li><strong>Payment Method:</strong> Cash, Check, Card, etc.</li>
                </ul>
              </Step>
              <Step number="5">Click <strong>"Save Reservation"</strong></Step>

              <Tip>
                After saving a reservation, you can send a confirmation email to the buyer 
                by clicking "Send Confirmation" in the reservation details.
              </Tip>
            </ManualSection>

            {/* PLOTS */}
            <ManualSection icon={Map} title="Plot Management">
              <p>
                View and manage all cemetery plots. See which plots are available, 
                reserved, or occupied.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding Plot Status Colors</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="inline-block w-4 h-4 bg-green-500 rounded mr-2"></span><strong>Green = Available:</strong> Plot is open for sale</li>
                <li><span className="inline-block w-4 h-4 bg-yellow-500 rounded mr-2"></span><strong>Yellow = Reserved:</strong> Plot is reserved but not yet used</li>
                <li><span className="inline-block w-4 h-4 bg-blue-500 rounded mr-2"></span><strong>Blue = Occupied:</strong> Someone is buried here</li>
                <li><span className="inline-block w-4 h-4 bg-purple-500 rounded mr-2"></span><strong>Purple = Veteran:</strong> Reserved for or occupied by a veteran</li>
                <li><span className="inline-block w-4 h-4 bg-gray-400 rounded mr-2"></span><strong>Gray = Not Usable:</strong> Plot cannot be used</li>
              </ul>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Update a Plot</h4>
              <Step number="1">Find the plot using the map view or search</Step>
              <Step number="2">Click on the plot to select it</Step>
              <Step number="3">Click <strong>"Edit"</strong> in the popup that appears</Step>
              <Step number="4">Change the information you need to update</Step>
              <Step number="5">Click <strong>"Save Changes"</strong></Step>

              <Tip>
                Use the Section and Row filters at the top to quickly narrow down 
                which plots you're looking at. This is especially helpful for large sections!
              </Tip>
            </ManualSection>

            {/* LAWN CARE */}
            <ManualSection icon={Leaf} title="Lawn Care">
              <p>
                Track lawn maintenance schedules, mowing records, and groundskeeping activities.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Log Lawn Care Activity</h4>
              <Step number="1">Click <strong>"Add Entry"</strong></Step>
              <Step number="2">Select the date the work was done</Step>
              <Step number="3">Choose the type of work:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Mowing</li>
                  <li>Trimming/Edging</li>
                  <li>Leaf Removal</li>
                  <li>Fertilizing</li>
                  <li>Other Maintenance</li>
                </ul>
              </Step>
              <Step number="4">Select which sections were serviced</Step>
              <Step number="5">Add any notes about conditions or issues found</Step>
              <Step number="6">Click <strong>"Save"</strong></Step>

              <Tip>
                Regular lawn care logging helps track when each section was last serviced 
                and ensures no area is neglected.
              </Tip>
            </ManualSection>

            {/* CRM */}
            <ManualSection icon={MessageSquare} title="CRM (Customer Relations)">
              <p>
                The CRM (Customer Relationship Management) helps you track interactions 
                with families, follow-ups needed, and maintain good relationships.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Add a Contact Interaction</h4>
              <Step number="1">Find the contact in the list or search by name</Step>
              <Step number="2">Click on their name to open their profile</Step>
              <Step number="3">Click <strong>"Add Interaction"</strong></Step>
              <Step number="4">Choose the type: Phone Call, Email, Visit, or Other</Step>
              <Step number="5">Write a brief note about what was discussed</Step>
              <Step number="6">If follow-up is needed, check the box and set a date</Step>
              <Step number="7">Click <strong>"Save"</strong></Step>

              <Tip>
                Set follow-up reminders for important contacts. The system will 
                notify you when it's time to reach out again!
              </Tip>
            </ManualSection>

            {/* ONBOARDING */}
            <ManualSection icon={UserPlus} title="Onboarding New Members">
              <p>
                This section helps you add new cemetery association members and track 
                their onboarding progress.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Add a New Member</h4>
              <Step number="1">Fill out the <strong>Onboarding Form</strong> on the left side:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Full legal name</li>
                  <li>Email address (this is how they'll log in)</li>
                  <li>Phone number</li>
                  <li>Mailing address</li>
                </ul>
              </Step>
              <Step number="2">Click <strong>"Send Invitation"</strong></Step>
              <Step number="3">The new member will receive an email with login instructions</Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Tracking Progress</h4>
              <p>
                The <strong>Onboarding Progress</strong> panel in the middle shows which 
                members have:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Accepted their invitation</li>
                <li>Completed their profile</li>
                <li>Signed required documents</li>
              </ul>

              <Tip>
                If someone hasn't responded to their invitation after a week, 
                you can resend it by clicking "Resend Invitation" next to their name.
              </Tip>
            </ManualSection>

            {/* EMPLOYEES */}
            <ManualSection icon={Users} title="Employee Management">
              <p>
                Manage staff information, contact details, and employment records.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Add a New Employee</h4>
              <Step number="1">Click <strong>"Add Employee"</strong></Step>
              <Step number="2">Fill in their personal information:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Full name</li>
                  <li>Phone number(s)</li>
                  <li>Email address</li>
                  <li>Home address</li>
                  <li>Emergency contact</li>
                </ul>
              </Step>
              <Step number="3">Select their employment type:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Administrator:</strong> Has full access to this system</li>
                  <li><strong>Paid Employee:</strong> Regular staff member</li>
                  <li><strong>Volunteer:</strong> Unpaid helper</li>
                </ul>
              </Step>
              <Step number="4">Choose their department and job title</Step>
              <Step number="5">Click <strong>"Save Employee"</strong></Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Employee Documents</h4>
              <p>
                Each employee record can store important documents like:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Signed contracts</li>
                <li>Certifications</li>
                <li>Tax forms (W-4, I-9)</li>
                <li>Training certificates</li>
              </ul>

              <Tip>
                Keep employee documents up to date! The system will alert you 
                when certifications are about to expire.
              </Tip>
            </ManualSection>

            {/* ARCHIVES */}
            <ManualSection icon={Archive} title="Employee Archives">
              <p>
                Former employees are moved to Archives instead of being deleted. 
                This preserves historical records while keeping the active employee list clean.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Archive an Employee</h4>
              <Step number="1">Go to the <strong>Employees</strong> tab</Step>
              <Step number="2">Find the employee you want to archive</Step>
              <Step number="3">Click on their name to open their profile</Step>
              <Step number="4">Click the <strong>"Archive"</strong> button</Step>
              <Step number="5">Confirm when asked</Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Restoring an Archived Employee</h4>
              <Step number="1">Go to the <strong>Archives</strong> tab</Step>
              <Step number="2">Find the former employee</Step>
              <Step number="3">Click <strong>"Restore"</strong> to move them back to active</Step>

              <Tip>
                Archived records are never truly deleted. You can always find 
                historical information about former staff members here.
              </Tip>
            </ManualSection>

            {/* VENDORS */}
            <ManualSection icon={Truck} title="Vendor Management">
              <p>
                Keep track of companies and contractors you work with, such as 
                landscapers, monument companies, and suppliers.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Add a New Vendor</h4>
              <Step number="1">Click <strong>"Add Vendor"</strong></Step>
              <Step number="2">Enter company information:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Company name</li>
                  <li>Contact person's name</li>
                  <li>Phone number</li>
                  <li>Email address</li>
                  <li>Services they provide</li>
                </ul>
              </Step>
              <Step number="3">Click <strong>"Save"</strong></Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Recording Invoices</h4>
              <p>
                You can attach invoices to vendor records to track payments and expenses.
              </p>
              <Step number="1">Open the vendor's profile</Step>
              <Step number="2">Click <strong>"Add Invoice"</strong></Step>
              <Step number="3">Enter the invoice details and amount</Step>
              <Step number="4">Upload the invoice document if you have it</Step>

              <Tip>
                Keep vendor contact information current! It's frustrating to need 
                a service and find an outdated phone number.
              </Tip>
            </ManualSection>

            {/* CALENDAR */}
            <ManualSection icon={Calendar} title="Calendar & Events">
              <p>
                Schedule and manage cemetery events, meetings, and important dates.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Create a New Event</h4>
              <Step number="1">Click on the date in the calendar, or click <strong>"New Event"</strong></Step>
              <Step number="2">Fill in the event details:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Title:</strong> Name of the event (e.g., "Board Meeting")</li>
                  <li><strong>Date & Time:</strong> When it starts and ends</li>
                  <li><strong>Location:</strong> Where it will be held</li>
                  <li><strong>Description:</strong> Any additional details</li>
                </ul>
              </Step>
              <Step number="3">Choose who should be notified about this event</Step>
              <Step number="4">Click <strong>"Save Event"</strong></Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Event Reminders</h4>
              <p>
                The system can send automatic reminders before events. When creating an event:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Check "Send Reminder" to enable notifications</li>
                <li>Choose when to send: 1 day before, 1 week before, etc.</li>
              </ul>

              <Tip>
                Use different colors for different types of events (meetings, 
                memorial services, maintenance) to see your schedule at a glance!
              </Tip>
            </ManualSection>

            {/* ANNOUNCEMENTS */}
            <ManualSection icon={Megaphone} title="News & Announcements">
              <p>
                Post news and announcements that appear on the public website 
                and member portal.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Create an Announcement</h4>
              <Step number="1">Click <strong>"New Announcement"</strong></Step>
              <Step number="2">Enter the announcement details:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Title:</strong> A clear, descriptive headline</li>
                  <li><strong>Content:</strong> The full message you want to share</li>
                  <li><strong>Category:</strong> News, Event, Alert, or General</li>
                </ul>
              </Step>
              <Step number="3">Choose visibility:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Public:</strong> Anyone visiting the website can see it</li>
                  <li><strong>Members Only:</strong> Only logged-in members can see it</li>
                </ul>
              </Step>
              <Step number="4">Set the publish date (now or schedule for later)</Step>
              <Step number="5">Click <strong>"Publish"</strong></Step>

              <Tip>
                Keep announcements brief and to the point. If you have detailed 
                information, consider posting a summary with a link to read more.
              </Tip>
            </ManualSection>

            {/* TASKS */}
            <ManualSection icon={CheckSquare} title="Task Management">
              <p>
                Create and track tasks for yourself and other administrators. 
                Never forget an important to-do again!
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Create a Task</h4>
              <Step number="1">Click <strong>"Add Task"</strong></Step>
              <Step number="2">Enter the task details:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Title:</strong> What needs to be done</li>
                  <li><strong>Description:</strong> Additional details or instructions</li>
                  <li><strong>Due Date:</strong> When it should be completed</li>
                  <li><strong>Priority:</strong> Low, Medium, High, or Urgent</li>
                  <li><strong>Assign To:</strong> Who is responsible</li>
                </ul>
              </Step>
              <Step number="3">Click <strong>"Save Task"</strong></Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Completing a Task</h4>
              <Step number="1">Find the task in your list</Step>
              <Step number="2">Click the checkbox next to the task, OR</Step>
              <Step number="3">Open the task and click <strong>"Mark Complete"</strong></Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Task Notifications</h4>
              <p>You'll receive notifications when:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>A task is assigned to you</li>
                <li>A due date is approaching</li>
                <li>A task becomes overdue</li>
              </ul>

              <Tip>
                Set realistic due dates! It's better to finish early than to have 
                a list full of overdue tasks.
              </Tip>
            </ManualSection>

            {/* MEMBERS */}
            <ManualSection icon={Users} title="Member Directory">
              <p>
                View and manage all cemetery association members, their contact 
                information, and their accounts.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Finding a Member</h4>
              <Step number="1">Use the search box to type a name, email, or phone number</Step>
              <Step number="2">Or use the filters to narrow by status, membership type, etc.</Step>
              <Step number="3">Click on a member's name to view their full profile</Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Member Profile Contents</h4>
              <p>Each member profile shows:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Contact information (phone, email, address)</li>
                <li>Plots they own or are associated with</li>
                <li>Payment history</li>
                <li>Documents they've signed</li>
                <li>Communication history</li>
              </ul>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Updating Member Information</h4>
              <Step number="1">Open the member's profile</Step>
              <Step number="2">Click <strong>"Edit"</strong></Step>
              <Step number="3">Make your changes</Step>
              <Step number="4">Click <strong>"Save Changes"</strong></Step>

              <Tip>
                If a member has moved or changed their phone number, update it right away! 
                Accurate contact information is essential for important communications.
              </Tip>
            </ManualSection>

            {/* DOCUMENTS */}
            <ManualSection icon={FileText} title="Document Management">
              <p>
                Store and organize important cemetery documents, forms, and files.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Upload a Document</h4>
              <Step number="1">Click <strong>"Upload Document"</strong></Step>
              <Step number="2">Click "Choose File" and select the file from your computer</Step>
              <Step number="3">Enter a clear, descriptive name for the document</Step>
              <Step number="4">Select a category (Contracts, Forms, Policies, etc.)</Step>
              <Step number="5">Click <strong>"Upload"</strong></Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Document Categories</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Contracts:</strong> Legal agreements</li>
                <li><strong>Forms:</strong> Blank forms for various purposes</li>
                <li><strong>Policies:</strong> Rules and procedures</li>
                <li><strong>Meeting Minutes:</strong> Records of board meetings</li>
                <li><strong>Financial:</strong> Budgets, reports, tax documents</li>
              </ul>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Finding Documents</h4>
              <Step number="1">Use the search box to find by name</Step>
              <Step number="2">Or filter by category using the dropdown</Step>
              <Step number="3">Click on a document to view or download it</Step>

              <Tip>
                Use clear, consistent naming for documents. For example: 
                "2024-Board-Meeting-Minutes-January" is better than "meeting notes.pdf"
              </Tip>
            </ManualSection>

            {/* BACKUPS */}
            <ManualSection icon={Database} title="Backups & Data Safety">
              <p>
                Create backups of your cemetery data to protect against loss. 
                This is very important!
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Create a Backup</h4>
              <Step number="1">Click <strong>"Create Backup"</strong></Step>
              <Step number="2">Wait while the system prepares your data (this may take a minute)</Step>
              <Step number="3">When ready, click <strong>"Download"</strong> to save to your computer</Step>
              <Step number="4">Store the downloaded file in a safe location</Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Backup Best Practices</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>Create a backup at least once a week</li>
                <li>Store backups in multiple locations (computer, external drive, cloud)</li>
                <li>Keep backups for at least 6 months before deleting old ones</li>
              </ul>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Restoring from Backup</h4>
              <p className="text-red-700 font-semibold">
                ⚠️ Restoring a backup will replace current data! Only do this if something 
                has gone wrong and you need to recover lost information.
              </p>
              <Step number="1">Click <strong>"Restore Backup"</strong></Step>
              <Step number="2">Select the backup file from your computer</Step>
              <Step number="3">Confirm that you want to proceed</Step>

              <Tip>
                The system also creates automatic backups, but it's wise to keep 
                your own copies just in case!
              </Tip>
            </ManualSection>

            {/* COMMUNICATIONS */}
            <ManualSection icon={Mail} title="Communications Center">
              <p>
                Send emails, view messages from the contact form, and manage 
                all correspondence with members and the public.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Viewing Incoming Messages</h4>
              <p>
                When someone submits the Contact Form on the website, their message 
                appears here. To respond:
              </p>
              <Step number="1">Click on the message to open it</Step>
              <Step number="2">Read the full message and any attachments</Step>
              <Step number="3">Click <strong>"Reply"</strong> to send a response</Step>
              <Step number="4">When finished, click <strong>"Mark as Handled"</strong></Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Sending an Email</h4>
              <Step number="1">Click <strong>"Compose Email"</strong></Step>
              <Step number="2">Choose recipients (individual, group, or all members)</Step>
              <Step number="3">Enter your subject line</Step>
              <Step number="4">Write your message in the body area</Step>
              <Step number="5">Click <strong>"Send"</strong></Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Using Email Templates</h4>
              <p>
                For common messages, you can use templates to save time:
              </p>
              <Step number="1">Click <strong>"Use Template"</strong></Step>
              <Step number="2">Select the template you want</Step>
              <Step number="3">The message fills in automatically</Step>
              <Step number="4">Customize as needed, then send</Step>

              <Tip>
                Always proofread before sending! Once an email is sent, 
                you cannot take it back.
              </Tip>
            </ManualSection>

            {/* SYSTEM LOGS */}
            <ManualSection icon={Shield} title="System Logs">
              <p>
                View a record of all actions taken in the system. This helps 
                track changes and troubleshoot issues.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">What the Logs Show</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Who made changes (which administrator)</li>
                <li>What was changed (created, updated, deleted)</li>
                <li>When it happened (date and time)</li>
                <li>Details about what changed</li>
              </ul>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Finding Specific Activity</h4>
              <Step number="1">Use the date filter to narrow down the time period</Step>
              <Step number="2">Use the action filter (Create, Update, Delete)</Step>
              <Step number="3">Search by username or record type</Step>

              <Tip>
                If something looks wrong with a record, check the logs to see 
                what changes were made and when. This can help identify mistakes!
              </Tip>
            </ManualSection>

            {/* NOTIFICATIONS */}
            <ManualSection icon={Bell} title="Notifications (Bell Icon)">
              <p>
                The bell icon in the top right shows alerts and reminders 
                that need your attention.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Bell</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Red dot with number:</strong> You have unread notifications</li>
                <li><strong>No dot:</strong> All notifications have been viewed</li>
                <li><strong>Shaking bell:</strong> New notification just arrived</li>
              </ul>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Types of Notifications</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Tasks:</strong> Task assigned to you or coming due</li>
                <li><strong>Events:</strong> Upcoming calendar events</li>
                <li><strong>Messages:</strong> New contact form submissions</li>
                <li><strong>Alerts:</strong> System alerts or important notices</li>
              </ul>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Taking Action on Notifications</h4>
              <Step number="1">Click the bell icon to open the list</Step>
              <Step number="2">Click on a notification to go to that item</Step>
              <Step number="3">Use the action buttons to Complete, Update, or Dismiss</Step>

              <Tip>
                Check your notifications regularly! Don't let important items 
                pile up without attention.
              </Tip>
            </ManualSection>

            {/* SEARCH */}
            <ManualSection icon={Search} title="Using the Search Bar">
              <p>
                The search bar at the top of the page helps you quickly find 
                anything in the system.
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Search</h4>
              <Step number="1">Click in the search box (or press Ctrl+K on your keyboard)</Step>
              <Step number="2">Type what you're looking for</Step>
              <Step number="3">Results appear as you type</Step>
              <Step number="4">Click on a result to go to that record</Step>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Search Tips</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>Search finds: Members, plots, employees, vendors, tasks, and more</li>
                <li>Partial matches work: "John" finds "Johnson"</li>
                <li>Not case sensitive: "smith" finds "Smith"</li>
                <li>Search by plot number: "A-15" finds that plot</li>
              </ul>

              <Tip>
                The search is very powerful. If you can't find something by 
                browsing, try searching for it instead!
              </Tip>
            </ManualSection>

            {/* NEED HELP */}
            <ManualSection icon={Phone} title="Getting Additional Help">
              <p>
                If you need help that isn't covered in this manual, here are your options:
              </p>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Contact Support</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Darrell Clendennen:</strong> (540) 760-8863 or clencsm@yahoo.com</li>
                <li><strong>RD Teutsch:</strong> (318) 846-2201 or royteutsch@yahoo.com</li>
              </ul>

              <h4 className="font-bold text-stone-800 mt-4 mb-2">Before Calling for Help</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>Note down exactly what you were trying to do</li>
                <li>Write down any error messages you see</li>
                <li>Take a screenshot if possible (press Print Screen on your keyboard)</li>
              </ul>

              <Tip>
                Most problems have simple solutions! Don't be afraid to ask 
                for help – that's what we're here for.
              </Tip>
            </ManualSection>

          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

export default AdminManual;