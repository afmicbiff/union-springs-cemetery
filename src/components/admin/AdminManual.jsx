import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
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
  Plus,
  Save,
  Trash2,
  Edit,
  Filter,
  Move,
  Maximize2,
  Minimize2,
  X,
  GripVertical
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

// Resizable/Moveable Manual Content
const ResizeableManualContent = memo(function ResizeableManualContent({ defaultSection, onClose }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: 900, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [prevState, setPrevState] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  // Center on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const maxW = Math.min(900, window.innerWidth - 40);
      const maxH = Math.min(600, window.innerHeight - 40);
      setSize({ width: maxW, height: maxH });
      setPosition({
        x: Math.max(20, (window.innerWidth - maxW) / 2),
        y: Math.max(20, (window.innerHeight - maxH) / 2)
      });
    }
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((e) => {
    if (isMaximized) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - position.x, y: clientY - position.y };
    setIsDragging(true);
  }, [position, isMaximized]);

  const handleDrag = useCallback((e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const newX = Math.max(0, Math.min(clientX - dragOffset.current.x, window.innerWidth - size.width));
    const newY = Math.max(0, Math.min(clientY - dragOffset.current.y, window.innerHeight - size.height));
    setPosition({ x: newX, y: newY });
  }, [isDragging, size]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resize handlers
  const handleResizeStart = useCallback((e, direction) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    resizeStart.current = { 
      x: clientX, 
      y: clientY, 
      width: size.width, 
      height: size.height,
      posX: position.x,
      posY: position.y
    };
    setResizeDir(direction);
    setIsResizing(true);
  }, [size, position, isMaximized]);

  const handleResize = useCallback((e) => {
    if (!isResizing || !resizeDir) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - resizeStart.current.x;
    const deltaY = clientY - resizeStart.current.y;

    let newWidth = resizeStart.current.width;
    let newHeight = resizeStart.current.height;
    let newX = resizeStart.current.posX;
    let newY = resizeStart.current.posY;

    const minW = 320, minH = 300;
    const maxW = window.innerWidth - 20;
    const maxH = window.innerHeight - 20;

    if (resizeDir.includes('e')) {
      newWidth = Math.max(minW, Math.min(maxW - newX, resizeStart.current.width + deltaX));
    }
    if (resizeDir.includes('w')) {
      const possibleWidth = resizeStart.current.width - deltaX;
      if (possibleWidth >= minW && resizeStart.current.posX + deltaX >= 0) {
        newWidth = possibleWidth;
        newX = resizeStart.current.posX + deltaX;
      }
    }
    if (resizeDir.includes('s')) {
      newHeight = Math.max(minH, Math.min(maxH - newY, resizeStart.current.height + deltaY));
    }
    if (resizeDir.includes('n')) {
      const possibleHeight = resizeStart.current.height - deltaY;
      if (possibleHeight >= minH && resizeStart.current.posY + deltaY >= 0) {
        newHeight = possibleHeight;
        newY = resizeStart.current.posY + deltaY;
      }
    }

    setSize({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
  }, [isResizing, resizeDir]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeDir(null);
  }, []);

  // Mouse/Touch event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDrag, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDrag);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
      window.addEventListener('touchmove', handleResize, { passive: false });
      window.addEventListener('touchend', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
        window.removeEventListener('touchmove', handleResize);
        window.removeEventListener('touchend', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  const toggleMaximize = useCallback(() => {
    if (isMaximized) {
      if (prevState) {
        setPosition(prevState.position);
        setSize(prevState.size);
      }
      setIsMaximized(false);
    } else {
      setPrevState({ position, size });
      setPosition({ x: 10, y: 10 });
      setSize({ width: window.innerWidth - 20, height: window.innerHeight - 20 });
      setIsMaximized(true);
    }
  }, [isMaximized, prevState, position, size]);

  const resizeHandleClass = "absolute bg-transparent hover:bg-teal-400/30 transition-colors z-50";

  return (
    <div 
      ref={containerRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-stone-300 flex flex-col overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Title bar - draggable */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-stone-100 border-b border-stone-200 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="flex items-center gap-3">
          <GripVertical className="w-4 h-4 text-stone-400" />
          <BookOpen className="w-6 h-6 text-teal-700" />
          <h2 className="text-lg font-serif font-semibold text-stone-800">Admin Dashboard Manual</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-stone-200" onClick={toggleMaximize}>
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-600" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Subtitle */}
      <div className="px-4 py-2 border-b border-stone-100 bg-white">
        <p className="text-stone-600 text-sm">
          Click any section below to expand the instructions. Drag title bar to move, edges to resize.
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-4">
        <Accordion type="single" collapsible defaultValue={defaultSection} className="space-y-1">
          
          {/* GETTING STARTED */}
          <ManualSection icon={HelpCircle} title="Getting Started - Read This First">
            <p className="text-lg mb-4">
              <strong>Welcome to the Union Springs Cemetery Admin Dashboard!</strong> This comprehensive system 
              puts all cemetery management tools at your fingertips. Whether you're tracking plots, managing 
              members, or handling day-to-day operations, everything is organized in one easy-to-use location.
            </p>
            
            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Screen Layout</h4>
            <p className="mb-3">When you first log in, you'll see several important areas:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Header Bar (Top of Screen):</strong> Contains the title "Admin Dashboard," the search box, notifications bell, and important buttons like "Backups" and "Import Data"</li>
              <li><strong>Tab Navigation (Below Header):</strong> A row of clickable tabs like Overview, Deceased, Sales, Plots, etc. Click any tab to go to that section</li>
              <li><strong>Main Content Area (Below Tabs):</strong> This is where you see the information for whichever tab you've selected</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Navigate Between Sections</h4>
            <Step number="1">Look at the row of tabs below the header (Overview, Deceased, Sales, Plots, etc.)</Step>
            <Step number="2">Click once on any tab name with your mouse</Step>
            <Step number="3">The content below will change to show that section's information</Step>
            <Step number="4">The tab you're currently viewing will be highlighted in teal/green color</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Special Tabs with Dropdown Menus</h4>
            <p className="mb-2">Some tabs have a small arrow (▼) next to them. These have additional options:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Employees ▼:</strong> Click the arrow to see "Employees," "Onboarding," and "Archives" options</li>
              <li><strong>Communications ▼:</strong> Click the arrow to access communication features</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Common Buttons You'll See Everywhere</h4>
            <ButtonGuide icon={Plus} label="Add New / Create" description="Creates a brand new record - look for green or blue buttons with a + sign" />
            <ButtonGuide icon={Edit} label="Edit / Pencil Icon" description="Opens a record so you can change information - click this first, make changes, then Save" />
            <ButtonGuide icon={Save} label="Save / Save Changes" description="VERY IMPORTANT! Always click Save when you're done making changes, or your work will be lost" />
            <ButtonGuide icon={Trash2} label="Delete / Trash Icon" description="Permanently removes something - you'll be asked to confirm first. Use carefully!" />
            <ButtonGuide icon={Filter} label="Filter / Sort" description="Helps you narrow down long lists to find what you need faster" />

            <Tip>
              <strong>Golden Rule:</strong> Always click "Save" after making changes! If you navigate away 
              without saving, your changes will be lost. The system will usually warn you, but it's good 
              practice to save frequently.
            </Tip>

            <Tip>
              If something doesn't look right or you make a mistake, check the <strong>System Logs</strong> tab 
              to see what changed. When in doubt, ask a colleague before deleting anything permanently!
            </Tip>
          </ManualSection>

          {/* OVERVIEW */}
          <ManualSection icon={LayoutDashboard} title="Overview Dashboard">
            <p className="text-lg mb-4">
              <strong>The Overview is your command center.</strong> Every time you log into the Admin Dashboard, 
              this is what you'll see first. It gives you a quick snapshot of everything happening at 
              Union Springs Cemetery without having to click through multiple sections.
            </p>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Overview Cards</h4>
            <p className="mb-3">The Overview displays several "cards" - boxes with information. Here's what each one shows:</p>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong>Plot Statistics:</strong> Shows total number of plots, how many are available for sale, how many are reserved, and how many are occupied</li>
              <li><strong>Recent Reservations/Sales:</strong> Lists the most recent plot purchases or reservations with buyer names and dates</li>
              <li><strong>Upcoming Events:</strong> Shows calendar events coming up soon - meetings, memorial services, etc.</li>
              <li><strong>Tasks Needing Attention:</strong> Displays tasks that are due soon or overdue. Red items need immediate attention!</li>
              <li><strong>Recent Activity:</strong> A log of recent changes made by administrators - helps you see what others have been working on</li>
              <li><strong>Announcements:</strong> Quick preview of recent news posts</li>
              <li><strong>Lawn Care Status:</strong> When each section was last mowed or maintained</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Reading the Color Codes</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="inline-block w-4 h-4 bg-red-500 rounded mr-2"></span><strong>Red items:</strong> Urgent! Needs immediate attention (overdue tasks, critical alerts)</li>
              <li><span className="inline-block w-4 h-4 bg-orange-500 rounded mr-2"></span><strong>Orange/Yellow items:</strong> Coming due soon - plan to address these</li>
              <li><span className="inline-block w-4 h-4 bg-green-500 rounded mr-2"></span><strong>Green items:</strong> Good status, completed, or healthy</li>
              <li><span className="inline-block w-4 h-4 bg-blue-500 rounded mr-2"></span><strong>Blue items:</strong> Information or in-progress items</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">What to Do When You Log In</h4>
            <Step number="1">Look at the Overview first thing each morning</Step>
            <Step number="2">Check for any red or orange items that need attention</Step>
            <Step number="3">Review the "Tasks Needing Attention" section</Step>
            <Step number="4">Note any upcoming events for the day</Step>
            <Step number="5">If everything looks good, proceed to your regular work</Step>

            <Tip>
              Make it a habit to check the Overview each time you log in! It only takes 
              30 seconds and helps you catch important items before they become problems. 
              Think of it as your daily "briefing."
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
            <p className="text-lg mb-4">
              <strong>The Onboarding section helps you add new association members and track their setup progress.</strong> 
              When a new family joins Union Springs Cemetery, this is where you register them and send them 
              access to the Member Portal.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Employees" tab, then click the small arrow (▼) and select "Onboarding"</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Three-Panel Layout</h4>
            <p className="mb-3">The Onboarding page is divided into three sections:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Left Panel - Onboarding Form:</strong> Where you type in the new member's information</li>
              <li><strong>Middle Panel - Onboarding Progress:</strong> Shows all members who are in the process of setting up their accounts</li>
              <li><strong>Right Panel - Onboarding Guide:</strong> Helpful reference information about the process</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Add a Brand New Member</h4>
            <Step number="1">Look at the <strong>Onboarding Form</strong> on the left side of the screen</Step>
            <Step number="2">Fill in each field carefully:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>First Name:</strong> The person's first/given name (e.g., "John")</li>
                <li><strong>Last Name:</strong> The person's family name (e.g., "Smith")</li>
                <li><strong>Email Address:</strong> VERY IMPORTANT - this is how they will log in. Make sure it's correct!</li>
                <li><strong>Phone Number:</strong> Best number to reach them (include area code)</li>
                <li><strong>Address:</strong> Their mailing address for correspondence</li>
              </ul>
            </Step>
            <Step number="3">Double-check the email address - if it's wrong, they won't receive their invitation!</Step>
            <Step number="4">Click the <strong>"Send Invitation"</strong> button</Step>
            <Step number="5">The system will automatically send an email to the new member with instructions on how to set up their account</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">What Happens After You Send the Invitation</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>The new member appears in the <strong>Onboarding Progress</strong> panel with a "Pending" status</li>
              <li>They receive an email with a link to create their password</li>
              <li>Once they click the link and set up their account, their status changes to "Active"</li>
              <li>They can then log into the Member Portal to view their information, sign documents, etc.</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Tracking Member Progress</h4>
            <p className="mb-2">The middle panel shows the status of each new member:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Invitation Sent:</strong> Email has been sent, waiting for them to respond</li>
              <li><strong>Account Created:</strong> They've clicked the link and created a password</li>
              <li><strong>Profile Completed:</strong> They've filled in their personal information</li>
              <li><strong>Documents Signed:</strong> They've signed any required agreements</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">If Someone Didn't Get Their Invitation</h4>
            <Step number="1">Find their name in the Onboarding Progress panel</Step>
            <Step number="2">Click the <strong>"Resend Invitation"</strong> button next to their name</Step>
            <Step number="3">Ask them to check their spam/junk folder if they still don't see it</Step>
            <Step number="4">If needed, verify the email address is correct and update it</Step>

            <Tip>
              If a member says they never received the email, ask them to check their 
              <strong> spam or junk mail folder</strong> first. The invitation often gets filtered there. 
              If still not found, verify you typed their email address correctly!
            </Tip>

            <Tip>
              It's good practice to follow up with new members after one week if they haven't 
              completed their account setup. A friendly phone call can help!
            </Tip>
          </ManualSection>

          {/* EMPLOYEES */}
          <ManualSection icon={Users} title="Employee Management">
            <p className="text-lg mb-4">
              <strong>The Employee Management section stores all information about your staff, volunteers, and administrators.</strong> 
              This is your central hub for contact information, employment records, and important HR documents.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Employees" tab in the navigation bar</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Employee List</h4>
            <p className="mb-2">When you open the Employees section, you'll see a list of all active staff members showing:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name and photo (if uploaded)</li>
              <li>Job title and department</li>
              <li>Employment type (Administrator, Paid Employee, or Volunteer)</li>
              <li>Contact phone number and email</li>
              <li>Status (Active or Inactive)</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Add a New Employee</h4>
            <Step number="1">Click the <strong>"Add Employee"</strong> button (usually green or blue with a + icon)</Step>
            <Step number="2">A form will appear. Fill in the <strong>Basic Information</strong> section:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>First Name:</strong> Their given name</li>
                <li><strong>Last Name:</strong> Their family name</li>
                <li><strong>Email Address:</strong> Work or primary email (required for system access)</li>
                <li><strong>Primary Phone:</strong> Best number to reach them - include area code</li>
                <li><strong>Secondary Phone:</strong> Optional backup number</li>
              </ul>
            </Step>
            <Step number="3">Fill in the <strong>Address</strong> section:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Street Address</li>
                <li>City, State, ZIP Code</li>
              </ul>
            </Step>
            <Step number="4">Select their <strong>Employment Type</strong> - this is very important:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Administrator:</strong> Has FULL access to this Admin Dashboard - use sparingly!</li>
                <li><strong>Paid Employee:</strong> Regular wage or salary staff member</li>
                <li><strong>Volunteer:</strong> Unpaid helper who assists with operations</li>
              </ul>
            </Step>
            <Step number="5">Choose their <strong>Department</strong>:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Administration</li>
                <li>Groundskeeping</li>
                <li>Sales</li>
                <li>Maintenance</li>
                <li>Security</li>
                <li>Other</li>
              </ul>
            </Step>
            <Step number="6">Enter their <strong>Job Title</strong> (e.g., "Groundskeeper," "Office Manager")</Step>
            <Step number="7">Fill in <strong>Emergency Contact</strong> information - name, phone, relationship</Step>
            <Step number="8">Click <strong>"Save Employee"</strong> to add them to the system</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">The Employee Onboarding Checklist</h4>
            <p className="mb-2">Each employee record has a checklist to track required paperwork:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Form I-9:</strong> Employment eligibility verification</li>
              <li><strong>Form W-4:</strong> Federal tax withholding</li>
              <li><strong>Form L-4:</strong> Louisiana state tax withholding</li>
              <li><strong>Offer Letter:</strong> Signed employment offer</li>
              <li><strong>New Hire Reporting:</strong> State notification completed</li>
              <li><strong>Minor Cert:</strong> Work permit (if under 18)</li>
            </ul>
            <p className="mt-2">Check each box as documents are received. This helps ensure compliance!</p>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Uploading Employee Documents</h4>
            <Step number="1">Open an employee's profile by clicking their name</Step>
            <Step number="2">Scroll down to the <strong>"Documents"</strong> section</Step>
            <Step number="3">Click <strong>"Upload Document"</strong></Step>
            <Step number="4">Click <strong>"Choose File"</strong> and select the document from your computer</Step>
            <Step number="5">Select the document category:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Contracts</li>
                <li>Certifications</li>
                <li>HR Forms</li>
                <li>Legal</li>
                <li>Other</li>
              </ul>
            </Step>
            <Step number="6">If the document expires (like a certification), set the expiration date</Step>
            <Step number="7">Click <strong>"Upload"</strong> to save the document</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Editing an Existing Employee</h4>
            <Step number="1">Find the employee in the list</Step>
            <Step number="2">Click on their name to open their profile</Step>
            <Step number="3">Click the <strong>"Edit"</strong> button</Step>
            <Step number="4">Make your changes</Step>
            <Step number="5">Click <strong>"Save Changes"</strong> - don't forget this step!</Step>

            <Tip>
              Keep employee contact information current! If someone changes their phone number 
              or address, update it right away. You don't want to have outdated information 
              when you need to reach someone urgently.
            </Tip>

            <Tip>
              The system will automatically alert you when employee certifications are 
              about to expire. Make sure to set expiration dates when uploading documents!
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
            <p className="text-lg mb-4">
              <strong>The Documents section is your central filing cabinet.</strong> Store and organize all important 
              cemetery documents including contracts, forms, policies, and records from members and employees. 
              This section shows documents uploaded by administrators, members, and employees all in one place.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Documents" tab in the navigation bar</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Document List</h4>
            <p className="mb-2">The Documents page shows a table with all uploaded documents. Each row displays:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Document Name:</strong> The file name and description</li>
              <li><strong>Category:</strong> What type of document it is (Contracts, Forms, etc.)</li>
              <li><strong>Source:</strong> Who uploaded it - "Member" or "Employee" badges show where it came from</li>
              <li><strong>Associated With:</strong> Which member or employee the document belongs to</li>
              <li><strong>Upload Date:</strong> When it was added to the system</li>
              <li><strong>Expiration Date:</strong> When the document expires (if applicable)</li>
              <li><strong>Actions:</strong> Buttons to view, download, or manage the document</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Document Sources Explained</h4>
            <div className="bg-stone-50 rounded-lg p-4 mb-4">
              <ul className="space-y-2">
                <li><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">Member</span> Documents uploaded by members through the Member Portal</li>
                <li><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 mr-2">Employee</span> Documents uploaded by employees through the Employee Portal</li>
                <li><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-800 mr-2">Admin</span> Documents uploaded directly by administrators</li>
              </ul>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Find a Specific Document</h4>
            <Step number="1">Use the <strong>Search Box</strong> at the top to type part of the document name</Step>
            <Step number="2">Use the <strong>Category Filter</strong> dropdown to show only certain types (e.g., only Contracts)</Step>
            <Step number="3">Use the <strong>Source Filter</strong> to show only Member documents, only Employee documents, or all</Step>
            <Step number="4">Click on column headers to sort (e.g., click "Upload Date" to sort by newest first)</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Upload a New Document</h4>
            <Step number="1">Click the <strong>"Upload Document"</strong> button at the top of the page</Step>
            <Step number="2">Click <strong>"Choose File"</strong> or drag and drop a file from your computer</Step>
            <Step number="3">Enter a <strong>clear, descriptive name</strong> for the document (e.g., "2024 Board Meeting Minutes - March")</Step>
            <Step number="4">Select the appropriate <strong>Category</strong>:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Contracts:</strong> Legal agreements, signed contracts</li>
                <li><strong>Forms:</strong> Blank forms, applications</li>
                <li><strong>Policies:</strong> Rules, bylaws, procedures</li>
                <li><strong>Meeting Minutes:</strong> Records of board or committee meetings</li>
                <li><strong>Financial:</strong> Budgets, financial reports, tax documents</li>
                <li><strong>Legal:</strong> Legal notices, court documents</li>
                <li><strong>Other:</strong> Anything that doesn't fit the above</li>
              </ul>
            </Step>
            <Step number="5">If the document expires, set the <strong>Expiration Date</strong> (click the calendar icon)</Step>
            <Step number="6">Add any <strong>Notes</strong> that might be helpful for future reference</Step>
            <Step number="7">Click <strong>"Upload"</strong> to save the document</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Viewing and Downloading Documents</h4>
            <Step number="1">Find the document in the list</Step>
            <Step number="2">Click the <strong>"View"</strong> or <strong>eye icon</strong> to open the document in a new tab</Step>
            <Step number="3">To download, click the <strong>"Download"</strong> or <strong>arrow-down icon</strong></Step>
            <Step number="4">The file will download to your computer's Downloads folder</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Managing Document Categories</h4>
            <p className="mb-2">You can change a document's category after it's uploaded:</p>
            <Step number="1">Check the checkbox next to the document(s) you want to change</Step>
            <Step number="2">Click the <strong>"Categorize"</strong> button that appears</Step>
            <Step number="3">Select the new category from the dropdown</Step>
            <Step number="4">Click <strong>"Apply"</strong> to save the change</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Document Audit Trail</h4>
            <p className="mb-2">
              At the bottom of the Documents page, you'll see a <strong>Recent Activity</strong> section. 
              This shows who uploaded, changed, or deleted documents recently - helpful for tracking changes!
            </p>

            <Tip>
              <strong>Naming Best Practice:</strong> Use clear, consistent names like 
              "2024-01-15-Board-Meeting-Minutes.pdf" instead of vague names like "notes.pdf". 
              This makes documents much easier to find later!
            </Tip>

            <Tip>
              Documents with expiration dates will trigger alerts before they expire. 
              This is especially useful for certifications, insurance policies, and permits!
            </Tip>

            <Tip>
              Member and Employee documents are automatically linked to their profiles. 
              You can also view them from the individual Member or Employee detail page.
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
            <p className="text-lg mb-4">
              <strong>The bell icon is your alert center.</strong> It's located in the top right corner of the screen 
              and shows you important reminders, task alerts, new messages, and system notifications that need your attention.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>Where to Find It:</strong> Look in the upper right area of the Admin Dashboard, near the search bar and Backups button</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Reading the Bell Icon</h4>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong>Red circle with a number:</strong> You have unread notifications! The number tells you how many. If it shows "9+" that means 10 or more waiting</li>
              <li><strong>Plain bell (no red circle):</strong> All caught up - no new notifications to review</li>
              <li><strong>Red/colored bell:</strong> Important items are waiting - check them soon</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to View Your Notifications</h4>
            <Step number="1">Click once on the bell icon</Step>
            <Step number="2">A dropdown list appears showing all your notifications</Step>
            <Step number="3">Unread notifications appear with a light background; read ones appear normal</Step>
            <Step number="4">The newest notifications are at the top of the list</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Types of Notifications You'll See</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Task Notifications (Blue checkbox icon):</strong> A task has been assigned to you, is coming due, or is overdue</li>
              <li><strong>Event Notifications (Calendar icon):</strong> An upcoming event is approaching or starting soon</li>
              <li><strong>Message Notifications (Mail icon):</strong> A new message arrived from the website contact form or member portal</li>
              <li><strong>Document Notifications (File icon):</strong> A document is expiring soon or needs attention</li>
              <li><strong>Alert Notifications (Warning icon):</strong> System alerts or important administrative notices</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Taking Action on Notifications</h4>
            <p className="mb-3">Each notification has action buttons to help you respond quickly:</p>
            
            <div className="space-y-3 ml-4">
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="font-semibold text-stone-800 mb-2">For Task Notifications:</p>
                <ButtonGuide label="Complete" description="Marks the task as done and clears the notification" />
                <ButtonGuide label="Updated" description="Mark as reviewed without completing the task" />
              </div>
              
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="font-semibold text-stone-800 mb-2">For Event Notifications:</p>
                <ButtonGuide label="Complete" description="Mark the event reminder as handled" />
                <ButtonGuide label="Update" description="Go to the calendar to view or edit the event" />
              </div>
              
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="font-semibold text-stone-800 mb-2">For Message Notifications:</p>
                <ButtonGuide label="View" description="Go to the Communications section to read the message" />
                <ButtonGuide label="Dismiss" description="Clear the notification without viewing" />
              </div>
              
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="font-semibold text-stone-800 mb-2">For Other Notifications:</p>
                <ButtonGuide label="Dismiss" description="Remove the notification from your list" />
              </div>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Dismissing All Notifications</h4>
            <Step number="1">Click the bell icon to open the list</Step>
            <Step number="2">At the top of the notification list, click <strong>"Dismiss All"</strong></Step>
            <Step number="3">This clears general notifications but keeps task and message items for proper handling</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Clicking on a Notification</h4>
            <p className="mb-2">You can click directly on any notification text to go to the related item:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Clicking a task notification opens the Tasks section</li>
              <li>Clicking a message notification opens the Communications section</li>
              <li>Clicking an event notification opens the Calendar</li>
              <li>Clicking a member notification opens the Members directory</li>
            </ul>

            <Tip>
              <strong>Check notifications first thing!</strong> Make it a habit to click the bell icon 
              when you log in. A quick review of notifications helps you prioritize your day and ensures 
              nothing important falls through the cracks.
            </Tip>

            <Tip>
              If the bell shows a red number, address those notifications soon! They might be 
              overdue tasks, urgent messages, or time-sensitive alerts.
            </Tip>
          </ManualSection>

          {/* SEARCH */}
          <ManualSection icon={Search} title="Using the Search Bar">
            <p className="text-lg mb-4">
              <strong>The Search Bar is the fastest way to find anything.</strong> Instead of clicking through 
              multiple tabs, just type what you're looking for and the system will find it instantly. 
              It searches across all sections at once!
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>Where to Find It:</strong> The search bar is in the top right area of the Admin Dashboard header, usually showing a magnifying glass icon</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Search Step-by-Step</h4>
            <Step number="1">Look for the search icon (magnifying glass) in the top right of the screen</Step>
            <Step number="2">Click on it - a search box will appear</Step>
            <Step number="3">Type what you're looking for (a name, plot number, phone number, etc.)</Step>
            <Step number="4">Results start appearing as you type - you don't need to press Enter</Step>
            <Step number="5">Look through the results shown below the search box</Step>
            <Step number="6">Click on the result you want to go directly to that record</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">What You Can Search For</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Members:</strong> Type a member's name (first or last) → "Johnson"</li>
              <li><strong>Plots:</strong> Type a plot number → "A-15" or just "15"</li>
              <li><strong>Employees:</strong> Type an employee's name → "Robert"</li>
              <li><strong>Vendors:</strong> Type a company name → "Landscaping"</li>
              <li><strong>Tasks:</strong> Type words from a task → "mow north"</li>
              <li><strong>Phone Numbers:</strong> Type part of a phone number → "555-1234"</li>
              <li><strong>Email Addresses:</strong> Type part of an email → "gmail"</li>
              <li><strong>Deceased Records:</strong> Type a name → "Smith"</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Search Tips That Make Life Easier</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Partial names work:</strong> Typing "John" finds "John," "Johnson," "Johnny," etc.</li>
              <li><strong>Capitalization doesn't matter:</strong> "SMITH," "Smith," and "smith" all find the same results</li>
              <li><strong>Results are grouped:</strong> Members appear together, plots together, etc. - look for section headers</li>
              <li><strong>Be specific when needed:</strong> If "Smith" shows too many results, try "John Smith"</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding Search Results</h4>
            <p className="mb-2">When results appear, you'll see:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The type of record (Member, Plot, Employee, etc.) shown as a label</li>
              <li>The name or title of the record</li>
              <li>Brief details to help you identify the right one</li>
            </ul>
            <p className="mt-2">Click on any result to jump directly to that record!</p>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">If You Can't Find What You're Looking For</h4>
            <Step number="1">Try different search terms (last name instead of first name)</Step>
            <Step number="2">Check your spelling</Step>
            <Step number="3">Try searching for less text (just "Smith" instead of "John Smith")</Step>
            <Step number="4">If still not found, browse the relevant tab manually</Step>

            <Tip>
              <strong>The search bar is your best friend!</strong> It's much faster than clicking through 
              multiple tabs looking for something. When in doubt, search for it!
            </Tip>

            <Tip>
              If you know you'll need to find a record again, write down an easy-to-remember 
              detail like the plot number or last name. Then you can search for it quickly later.
            </Tip>
          </ManualSection>

          {/* NEED HELP */}
          <ManualSection icon={Phone} title="Getting Additional Help">
            <p className="text-lg mb-4">
              <strong>You're not alone!</strong> If you need help that isn't covered in this manual, 
              or if something isn't working as expected, here's how to get assistance.
            </p>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Contact Support</h4>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-teal-700" />
                  <div>
                    <strong className="text-stone-800">Darrell Clendennen</strong><br />
                    <span className="text-stone-600">Phone: (540) 760-8863</span><br />
                    <span className="text-stone-600">Email: clencsm@yahoo.com</span>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-teal-700" />
                  <div>
                    <strong className="text-stone-800">RD Teutsch</strong><br />
                    <span className="text-stone-600">Phone: (318) 846-2201</span><br />
                    <span className="text-stone-600">Email: royteutsch@yahoo.com</span>
                  </div>
                </li>
              </ul>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Before Calling for Help - Gather This Information</h4>
            <p className="mb-2">Having this information ready makes it MUCH easier to help you:</p>
            <Step number="1"><strong>What were you trying to do?</strong> (e.g., "I was trying to add a new member")</Step>
            <Step number="2"><strong>What happened instead?</strong> (e.g., "I got an error message" or "nothing happened when I clicked Save")</Step>
            <Step number="3"><strong>Write down any error messages</strong> - the exact words on the screen help diagnose the problem</Step>
            <Step number="4"><strong>Which tab/section were you in?</strong> (e.g., "I was in the Members section")</Step>
            <Step number="5"><strong>Take a screenshot if possible:</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>On Windows: Press the <strong>Print Screen</strong> key (or <strong>PrtSc</strong>) on your keyboard</li>
                <li>Then open an email, click in the message area, and press <strong>Ctrl+V</strong> to paste the image</li>
                <li>Send the screenshot with your description of the problem</li>
              </ul>
            </Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Common Issues and Quick Fixes</h4>
            <div className="space-y-3">
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="font-semibold text-stone-800">"The page won't load" or "It's frozen"</p>
                <p className="text-stone-600 text-sm mt-1">Try refreshing the page by pressing <strong>F5</strong> on your keyboard, or click the circular arrow in your browser. If still stuck, close the browser completely and reopen it.</p>
              </div>
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="font-semibold text-stone-800">"I can't find my changes"</p>
                <p className="text-stone-600 text-sm mt-1">Did you click <strong>Save</strong> after making changes? If not, your changes were lost. Also try refreshing the page to see the latest data.</p>
              </div>
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="font-semibold text-stone-800">"I'm locked out" or "Wrong password"</p>
                <p className="text-stone-600 text-sm mt-1">Use the "Forgot Password" link on the login page, or contact an administrator to reset your password.</p>
              </div>
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="font-semibold text-stone-800">"The search isn't finding anything"</p>
                <p className="text-stone-600 text-sm mt-1">Try different search terms. Check your spelling. Search for just the last name instead of full name. Try fewer words.</p>
              </div>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Check the System Logs</h4>
            <p className="mb-2">
              If something changed unexpectedly, the <strong>System Logs</strong> tab shows a record of all 
              changes made in the system. This can help you (or support) figure out what happened.
            </p>

            <Tip>
              <strong>Don't be shy about asking for help!</strong> Everyone needs assistance sometimes, 
              and it's better to ask than to struggle alone or make a mistake. We're here to help you succeed!
            </Tip>

            <Tip>
              <strong>Write down solutions!</strong> If you figure out how to do something tricky, 
              write yourself a note for next time. You might also share it with other administrators!
            </Tip>
          </ManualSection>

        </Accordion>
      </div>

      {/* Resize handles - all 8 directions */}
      {!isMaximized && (
        <>
          {/* Edges */}
          <div className={`${resizeHandleClass} top-0 left-2 right-2 h-2 cursor-n-resize`} onMouseDown={(e) => handleResizeStart(e, 'n')} onTouchStart={(e) => handleResizeStart(e, 'n')} />
          <div className={`${resizeHandleClass} bottom-0 left-2 right-2 h-2 cursor-s-resize`} onMouseDown={(e) => handleResizeStart(e, 's')} onTouchStart={(e) => handleResizeStart(e, 's')} />
          <div className={`${resizeHandleClass} left-0 top-2 bottom-2 w-2 cursor-w-resize`} onMouseDown={(e) => handleResizeStart(e, 'w')} onTouchStart={(e) => handleResizeStart(e, 'w')} />
          <div className={`${resizeHandleClass} right-0 top-2 bottom-2 w-2 cursor-e-resize`} onMouseDown={(e) => handleResizeStart(e, 'e')} onTouchStart={(e) => handleResizeStart(e, 'e')} />
          {/* Corners */}
          <div className={`${resizeHandleClass} top-0 left-0 w-4 h-4 cursor-nw-resize`} onMouseDown={(e) => handleResizeStart(e, 'nw')} onTouchStart={(e) => handleResizeStart(e, 'nw')} />
          <div className={`${resizeHandleClass} top-0 right-0 w-4 h-4 cursor-ne-resize`} onMouseDown={(e) => handleResizeStart(e, 'ne')} onTouchStart={(e) => handleResizeStart(e, 'ne')} />
          <div className={`${resizeHandleClass} bottom-0 left-0 w-4 h-4 cursor-sw-resize`} onMouseDown={(e) => handleResizeStart(e, 'sw')} onTouchStart={(e) => handleResizeStart(e, 'sw')} />
          <div className={`${resizeHandleClass} bottom-0 right-0 w-4 h-4 cursor-se-resize`} onMouseDown={(e) => handleResizeStart(e, 'se')} onTouchStart={(e) => handleResizeStart(e, 'se')} />
        </>
      )}
    </div>
  );
});

const AdminManual = memo(function AdminManual({ currentTab }) {
  const [open, setOpen] = useState(false);
  const [defaultSection, setDefaultSection] = useState('');

  const handleOpen = useCallback(() => {
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
    setOpen(true);
  }, [currentTab]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2 border-teal-600 text-teal-700 hover:bg-teal-50"
        onClick={handleOpen}
      >
        <BookOpen className="w-4 h-4" />
        <span className="hidden sm:inline">How-To Manual</span>
        <span className="sm:hidden">Help</span>
      </Button>

      {open && (
        <>
          {/* Backdrop - transparent, just for click-outside-to-close */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={handleClose}
            style={{ background: 'transparent' }}
          />
          <ResizeableManualContent defaultSection={defaultSection} onClose={handleClose} />
        </>
      )}
    </>
  );
});

export default AdminManual;