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

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium">🎉 <strong>Good News:</strong> You don't need to be a computer expert to use this system! 
              This manual explains everything step-by-step. Take your time, and don't hesitate to refer back to these instructions.</p>
            </div>
            
            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Screen Layout</h4>
            <p className="mb-3">When you first log in, you'll see several important areas. Here's a map of the screen:</p>
            
            <div className="bg-stone-100 rounded-lg p-4 mb-4 border-2 border-stone-300">
              <div className="space-y-2 text-sm">
                <div className="bg-stone-700 text-white p-2 rounded text-center font-medium">
                  📍 TOP: Header Bar - "Admin Dashboard" title, Search icon (🔍), Bell icon (🔔)
                </div>
                <div className="bg-teal-600 text-white p-2 rounded text-center font-medium">
                  📍 MIDDLE: Tab Navigation Bar - Overview | Deceased | Sales | Plots | etc. | How-To Manual
                </div>
                <div className="bg-white p-4 rounded border-2 border-dashed border-stone-400 text-center">
                  📍 BOTTOM: Main Content Area<br/>
                  <span className="text-stone-500 text-xs">(This area changes based on which tab you click)</span>
                </div>
              </div>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">What Each Part Does</h4>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong>Header Bar (Very Top):</strong> Shows the page title "Admin Dashboard." On the right side, you'll find:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Search Icon (magnifying glass 🔍):</strong> Click to search for anything in the system</li>
                  <li><strong>Bell Icon (🔔):</strong> Shows notifications - if there's a red number, you have alerts to check!</li>
                </ul>
              </li>
              <li><strong>Tab Navigation Bar:</strong> This is the row of clickable words like "Overview," "Deceased," "Sales," etc. Click any word to go to that section. The "How-To Manual" button is at the far right of this bar.</li>
              <li><strong>Main Content Area:</strong> This big area below the tabs shows information for whichever section you've selected. It changes when you click different tabs.</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Navigate Between Sections - Step by Step</h4>
            <Step number="1">Look at the row of tabs below the header. You'll see words like: Overview, Deceased, Sales, Plots, Lawn Care, CRM, Tasks, etc.</Step>
            <Step number="2">Position your mouse cursor (the arrow on screen) over the tab you want</Step>
            <Step number="3">Click once with the LEFT mouse button (don't double-click, just one click)</Step>
            <Step number="4">The content below will change to show that section's information</Step>
            <Step number="5">Notice that the tab you clicked is now highlighted in a teal/green color - this tells you where you are</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Special Tabs with Dropdown Menus (The Little Arrows ▼)</h4>
            <p className="mb-2">Some tabs have a small down-arrow (▼) next to them. These tabs have extra options hidden inside:</p>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong>Employees ▼:</strong> Click the down-arrow to reveal three choices:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>"Employees" - See all current staff</li>
                  <li>"Onboarding" - Add new members to the system</li>
                  <li>"Archives" - See former employees</li>
                </ul>
              </li>
              <li><strong>Email Tool ▼:</strong> Click the down-arrow for email options:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>"Open Send Email" - Write and send an email</li>
                  <li>"Templates" - Use pre-written email templates</li>
                </ul>
              </li>
              <li><strong>Communications ▼:</strong> Click the down-arrow to access the communications center</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Use Dropdown Menus</h4>
            <Step number="1">Find a tab with a small arrow (▼) next to it</Step>
            <Step number="2">Click on the arrow (not the tab name itself)</Step>
            <Step number="3">A small menu will drop down showing your options</Step>
            <Step number="4">Click on the option you want</Step>
            <Step number="5">The dropdown will close and you'll be taken to that section</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Common Buttons You'll See Everywhere</h4>
            <p className="mb-3">Throughout the system, you'll encounter these buttons. Learn what they do:</p>
            <ButtonGuide icon={Plus} label="Add New / + Create" description="Creates a brand new record. Look for green or teal buttons with a + sign. Click this when you want to add something new to the system." />
            <ButtonGuide icon={Edit} label="Edit / Pencil Icon ✏️" description="Opens a record so you can change information. Always click this FIRST, then make your changes, then click Save." />
            <ButtonGuide icon={Save} label="Save / Save Changes" description="VERY IMPORTANT! Always click Save when you're done making changes. If you don't click Save, your work will be LOST!" />
            <ButtonGuide icon={Trash2} label="Delete / Trash Icon 🗑️" description="Permanently removes something. The system will ask 'Are you sure?' first. Think carefully before clicking Yes!" />
            <ButtonGuide icon={Filter} label="Filter / Sort" description="Helps you narrow down long lists. For example, show only 'Reserved' plots instead of all plots." />

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Opening This Help Manual</h4>
            <p className="mb-2">You can open this How-To Manual anytime you need help:</p>
            <Step number="1">Look at the far right end of the tab navigation bar</Step>
            <Step number="2">Find the button that says "How-To Manual" (with a book icon 📖)</Step>
            <Step number="3">Click it once to open this manual</Step>
            <Step number="4">Click any section title to expand and read the instructions</Step>
            <Step number="5">Click the X in the top right corner to close the manual when done</Step>

            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4 rounded-r-lg">
              <h5 className="font-bold text-amber-800 mb-2">⚠️ THE GOLDEN RULE - PLEASE READ!</h5>
              <p className="text-amber-800">
                <strong>Always click "Save" after making changes!</strong> If you change information and then 
                click away to another section without saving, your changes will be LOST. The system sometimes 
                shows a warning, but not always. Make it a habit: <strong>Change → Save → Then move on.</strong>
              </p>
            </div>

            <Tip>
              If something doesn't look right or you make a mistake, check the <strong>System Logs</strong> tab 
              to see what changed and when. This can help you understand what happened.
            </Tip>

            <Tip>
              <strong>When in doubt, ask!</strong> It's always better to ask a colleague or call for help 
              than to guess and potentially delete something important. Don't be embarrassed - everyone 
              needs help sometimes!
            </Tip>

            <Tip>
              <strong>Take your time.</strong> There's no rush. Read each screen carefully before clicking. 
              If you're unsure what a button does, refer back to this manual.
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
            <p className="text-lg mb-4">
              <strong>The Deceased Records section is where you maintain information about individuals who are buried at Union Springs Cemetery.</strong> 
              This is one of the most important sections - it's the permanent record of who rests in our cemetery and where they are located.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Deceased" tab in the navigation bar</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Deceased List</h4>
            <p className="mb-2">When you open this section, you'll see a list showing:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name of the deceased person</li>
              <li>Date of birth and date of death</li>
              <li>Plot location (Section, Row, and Plot number)</li>
              <li>Veteran status (if applicable)</li>
              <li>Any notes or special information</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Add a New Deceased Record</h4>
            <Step number="1">Click the <strong>"Add Deceased"</strong> button (usually at the top right, green or blue with a + icon)</Step>
            <Step number="2">A form will appear. Fill in the person's information carefully:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>First Name:</strong> The person's given name (e.g., "John")</li>
                <li><strong>Last Name:</strong> The person's family name (e.g., "Smith")</li>
                <li><strong>Date of Birth:</strong> Click the calendar icon, then select the month, year, and day</li>
                <li><strong>Date of Death:</strong> Click the calendar icon, then select the month, year, and day</li>
                <li><strong>Plot Location:</strong> Select the Section, Row, and Plot number where they are buried</li>
                <li><strong>Veteran Status:</strong> Check this box if the person served in the U.S. military</li>
                <li><strong>Notes:</strong> Any additional information (maiden name, nickname, etc.)</li>
              </ul>
            </Step>
            <Step number="3">Double-check all the information is correct - especially dates and plot numbers</Step>
            <Step number="4">Click <strong>"Save"</strong> to store the record permanently</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Search for a Deceased Record</h4>
            <Step number="1">Look for the search box at the top of the Deceased page</Step>
            <Step number="2">Type any part of the person's name (first name, last name, or both)</Step>
            <Step number="3">Press the Enter key on your keyboard, or click the magnifying glass icon</Step>
            <Step number="4">The list will filter to show only matching records</Step>
            <Step number="5">To clear the search and see all records again, delete the text in the search box and press Enter</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Edit an Existing Record</h4>
            <Step number="1">Find the record in the list (use search if needed)</Step>
            <Step number="2">Click on the person's name, or click the <strong>"Edit"</strong> button</Step>
            <Step number="3">Make your corrections in the form that appears</Step>
            <Step number="4">Click <strong>"Save Changes"</strong> when done</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Using Filters to Find Records</h4>
            <p className="mb-2">Besides searching, you can filter the list by:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Section:</strong> Show only deceased in a specific cemetery section</li>
              <li><strong>Veteran Status:</strong> Show only veterans or only non-veterans</li>
              <li><strong>Date Range:</strong> Show deaths within a specific time period</li>
            </ul>

            <Tip>
              <strong>Search is flexible:</strong> You can search by first name, last name, or even plot number. 
              Capitalization doesn't matter - "Smith," "SMITH," and "smith" all find the same results.
            </Tip>

            <Tip>
              <strong>Be careful with dates!</strong> Always double-check birth and death dates before saving. 
              A typo in the year (like 1945 vs 1954) can cause confusion later.
            </Tip>
          </ManualSection>

          {/* SALES & RESERVATIONS */}
          <ManualSection icon={DollarSign} title="Sales & Reservations">
            <p className="text-lg mb-4">
              <strong>The Sales & Reservations section is where you manage all plot purchases and reservations.</strong> 
              When someone wants to buy or reserve a burial plot, this is where you record the transaction 
              and track payment status.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Sales" tab in the navigation bar</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding Reservation Status</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Pending:</strong> Reservation started but not yet confirmed or paid</li>
              <li><strong>Confirmed:</strong> Reservation is official, may be awaiting full payment</li>
              <li><strong>Paid in Full:</strong> All payments received, reservation complete</li>
              <li><strong>Cancelled:</strong> Reservation was cancelled</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Create a New Reservation</h4>
            <Step number="1">Click the <strong>"New Reservation"</strong> button at the top of the page</Step>
            <Step number="2">A form will open. First, select the plot(s) being reserved:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Click the <strong>"Select Plot"</strong> dropdown</li>
                <li>Choose the Section, Row, and Plot number</li>
                <li>You can add multiple plots to one reservation if the buyer wants more than one</li>
              </ul>
            </Step>
            <Step number="3">Enter the <strong>Buyer's Information</strong>:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Full Name:</strong> The person making the purchase</li>
                <li><strong>Phone Number:</strong> Best number to reach them (include area code)</li>
                <li><strong>Email Address:</strong> For sending confirmations and receipts</li>
                <li><strong>Mailing Address:</strong> Street, City, State, ZIP for official documents</li>
              </ul>
            </Step>
            <Step number="4">Enter the <strong>Payment Information</strong>:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Total Amount:</strong> The full price of the reservation</li>
                <li><strong>Amount Paid:</strong> How much they've paid so far</li>
                <li><strong>Payment Method:</strong> Cash, Check, Credit Card, or Money Order</li>
                <li><strong>Check Number:</strong> If they paid by check, record the check number</li>
                <li><strong>Payment Status:</strong> Pending, Partial, or Paid in Full</li>
              </ul>
            </Step>
            <Step number="5">Add any <strong>Notes</strong> about the transaction (special requests, payment plans, etc.)</Step>
            <Step number="6">Click <strong>"Save Reservation"</strong> to record the transaction</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Recording Additional Payments</h4>
            <p className="mb-2">If someone is making payments over time:</p>
            <Step number="1">Find the reservation in the list</Step>
            <Step number="2">Click on it to open the details</Step>
            <Step number="3">Click <strong>"Add Payment"</strong></Step>
            <Step number="4">Enter the payment amount, date, and method</Step>
            <Step number="5">Click <strong>"Save"</strong> - the system automatically updates the balance due</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Sending Confirmation to the Buyer</h4>
            <Step number="1">Open the reservation by clicking on it</Step>
            <Step number="2">Click the <strong>"Send Confirmation"</strong> button</Step>
            <Step number="3">Review the email that will be sent</Step>
            <Step number="4">Click <strong>"Send"</strong> to email the confirmation to the buyer</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Viewing Payment History</h4>
            <p className="mb-2">Each reservation shows a complete payment history:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Date of each payment</li>
              <li>Amount received</li>
              <li>Payment method</li>
              <li>Running balance</li>
            </ul>

            <Tip>
              <strong>Always get contact information!</strong> Make sure to record both phone number AND email 
              address. If there's ever a question about the reservation, you'll need to reach the buyer.
            </Tip>

            <Tip>
              <strong>For check payments:</strong> Always write down the check number! This helps if there's 
              ever a question about payment or if a check bounces.
            </Tip>
          </ManualSection>

          {/* PLOTS */}
          <ManualSection icon={Map} title="Plot Management">
            <p className="text-lg mb-4">
              <strong>The Plot Management section gives you a complete view of every burial plot in the cemetery.</strong> 
              You can see which plots are available, reserved, or occupied, and update plot information as needed. 
              This section includes both a visual map view and a list view.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Plots" tab in the navigation bar</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding Plot Status Colors</h4>
            <p className="mb-2">Each plot is color-coded so you can see its status at a glance:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="inline-block w-5 h-5 bg-green-500 rounded mr-2 align-middle"></span><strong>Green = Available:</strong> This plot is open for sale - no one has reserved or purchased it</li>
              <li><span className="inline-block w-5 h-5 bg-yellow-500 rounded mr-2 align-middle"></span><strong>Yellow = Reserved:</strong> Someone has reserved this plot but no one is buried there yet</li>
              <li><span className="inline-block w-5 h-5 bg-blue-500 rounded mr-2 align-middle"></span><strong>Blue = Occupied:</strong> Someone is buried in this plot</li>
              <li><span className="inline-block w-5 h-5 bg-purple-500 rounded mr-2 align-middle"></span><strong>Purple = Veteran:</strong> Reserved for or occupied by a military veteran</li>
              <li><span className="inline-block w-5 h-5 bg-gray-400 rounded mr-2 align-middle"></span><strong>Gray = Not Usable:</strong> This plot cannot be used (pathway, utility area, etc.)</li>
              <li><span className="inline-block w-5 h-5 bg-stone-300 rounded mr-2 align-middle"></span><strong>Light Gray = Unknown:</strong> Status needs to be verified</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Using the Map View</h4>
            <Step number="1">When you open Plots, you may see a visual map of the cemetery</Step>
            <Step number="2">Each small square or rectangle represents one plot</Step>
            <Step number="3">Hover your mouse over a plot to see basic information</Step>
            <Step number="4">Click on a plot to see full details and edit options</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Using Filters to Find Plots</h4>
            <Step number="1">Look for the filter options at the top of the page</Step>
            <Step number="2"><strong>Section Filter:</strong> Select a section (like "North" or "Section A") to show only plots in that area</Step>
            <Step number="3"><strong>Row Filter:</strong> After selecting a section, choose a specific row</Step>
            <Step number="4"><strong>Status Filter:</strong> Show only Available, Reserved, Occupied, etc.</Step>
            <Step number="5">The display will update immediately to show only matching plots</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Find a Specific Plot</h4>
            <Step number="1">If you know the plot number (like "A-15" or "Section 2, Row 3, Plot 7"):</Step>
            <Step number="2">Use the search box and type the plot identifier</Step>
            <Step number="3">Or use the Section and Row filters to narrow down, then find the plot visually</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Update a Plot's Information</h4>
            <Step number="1">Find the plot using search, filters, or the map view</Step>
            <Step number="2">Click on the plot to select it</Step>
            <Step number="3">A panel or popup will appear with plot details</Step>
            <Step number="4">Click the <strong>"Edit"</strong> button</Step>
            <Step number="5">Make your changes:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Status:</strong> Change from Available to Reserved, etc.</li>
                <li><strong>Occupant Info:</strong> Add or update who is buried there</li>
                <li><strong>Family Name:</strong> The family associated with this plot</li>
                <li><strong>Notes:</strong> Any special information about the plot</li>
              </ul>
            </Step>
            <Step number="6">Click <strong>"Save Changes"</strong> - the color will update to reflect the new status</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Changing a Plot's Status</h4>
            <p className="mb-2">Common status changes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Available → Reserved:</strong> When someone buys/reserves the plot</li>
              <li><strong>Reserved → Occupied:</strong> When a burial takes place</li>
              <li><strong>Available → Veteran:</strong> When designated for veteran use</li>
              <li><strong>Any → Not Usable:</strong> When a plot is discovered to be unusable</li>
            </ul>

            <Tip>
              <strong>Use filters to work faster!</strong> If you're updating plots in Section 2, set the Section 
              filter to "Section 2" first. This makes it much easier to find and update multiple plots in the same area.
            </Tip>

            <Tip>
              <strong>The map is interactive:</strong> You can click and drag to move around, and use zoom 
              controls (if available) to zoom in on specific areas.
            </Tip>
          </ManualSection>

          {/* LAWN CARE */}
          <ManualSection icon={Leaf} title="Lawn Care">
            <p className="text-lg mb-4">
              <strong>The Lawn Care section helps you track all grounds maintenance activities.</strong> 
              Keep records of when each section was mowed, trimmed, or maintained. This ensures 
              no area gets neglected and helps plan future maintenance schedules.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Lawn Care" tab in the navigation bar</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Lawn Care Dashboard</h4>
            <p className="mb-2">When you open Lawn Care, you'll see:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Section Status Cards:</strong> Each cemetery section shows when it was last serviced</li>
              <li><strong>Color Indicators:</strong> Green = recently done, Yellow = due soon, Red = overdue</li>
              <li><strong>Recent Activity Log:</strong> List of recent lawn care entries</li>
              <li><strong>Statistics:</strong> Summary of maintenance activities</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Log a Lawn Care Activity</h4>
            <Step number="1">Click the <strong>"Add Entry"</strong> or <strong>"Log Activity"</strong> button</Step>
            <Step number="2">Select the <strong>Date</strong> the work was performed (click the calendar icon)</Step>
            <Step number="3">Choose the <strong>Type of Work</strong> from the dropdown:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Mowing:</strong> Grass cutting</li>
                <li><strong>Trimming/Edging:</strong> Weed eating around headstones and borders</li>
                <li><strong>Leaf Removal:</strong> Raking or blowing leaves</li>
                <li><strong>Fertilizing:</strong> Applying lawn fertilizer</li>
                <li><strong>Weed Treatment:</strong> Applying herbicide</li>
                <li><strong>Irrigation:</strong> Watering or sprinkler system work</li>
                <li><strong>Other Maintenance:</strong> Any other groundskeeping work</li>
              </ul>
            </Step>
            <Step number="4">Select <strong>Which Sections</strong> were serviced:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Check the boxes for each section that was worked on</li>
                <li>You can select multiple sections if the same work was done in several areas</li>
              </ul>
            </Step>
            <Step number="5">Add <strong>Notes</strong> about conditions or issues found:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Note any problems (bare spots, drainage issues, ant hills, etc.)</li>
                <li>Record weather conditions if relevant</li>
                <li>Mention if any areas need follow-up work</li>
              </ul>
            </Step>
            <Step number="6">Click <strong>"Save"</strong> to record the entry</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Viewing Maintenance History</h4>
            <Step number="1">Click on a specific section card to see its full history</Step>
            <Step number="2">Or use the history/log view to see all activities</Step>
            <Step number="3">You can filter by date range, section, or type of work</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Planning Future Maintenance</h4>
            <p className="mb-2">The dashboard shows you:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Which sections are <strong>overdue</strong> (red - need attention now!)</li>
              <li>Which sections are <strong>due soon</strong> (yellow - plan for this week)</li>
              <li>Which sections are <strong>recently done</strong> (green - good for now)</li>
            </ul>

            <Tip>
              <strong>Log entries promptly!</strong> It's best to record lawn care activities the same day 
              they're completed. If you wait, you might forget important details about what was done.
            </Tip>

            <Tip>
              <strong>Note problems when you see them!</strong> If groundskeepers notice issues like damaged 
              headstones, sunken plots, or drainage problems during mowing, add them to the notes. 
              This creates a record for follow-up.
            </Tip>
          </ManualSection>

          {/* CRM */}
          <ManualSection icon={MessageSquare} title="CRM (Customer Relations)">
            <p className="text-lg mb-4">
              <strong>The CRM (Customer Relationship Management) section helps you maintain excellent relationships with families and members.</strong> 
              Track every phone call, email, and meeting. Set reminders for follow-ups so no one falls through the cracks.
              Good record-keeping here helps provide personal, caring service to families.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "CRM" tab in the navigation bar</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">What is CRM?</h4>
            <p className="mb-2">
              CRM stands for Customer Relationship Management. Think of it as a detailed address book 
              combined with a diary of every conversation you've had with each person. It helps you:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Remember what was discussed in past conversations</li>
              <li>Keep track of who needs a follow-up call</li>
              <li>See the complete history with any family at a glance</li>
              <li>Never forget important details about a relationship</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the CRM Screen</h4>
            <p className="mb-2">The CRM section shows:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Contacts List:</strong> All the people and families you track</li>
              <li><strong>Follow-Ups Due:</strong> A list of people you need to contact soon</li>
              <li><strong>Recent Interactions:</strong> Latest conversations and meetings logged</li>
              <li><strong>Segments:</strong> Groups of contacts organized by category</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Add a New Contact Interaction</h4>
            <p className="mb-2">When you talk to someone (phone, email, in person), record it:</p>
            <Step number="1">Find the contact in the list, or search by their name</Step>
            <Step number="2">Click on their name to open their profile</Step>
            <Step number="3">Click the <strong>"Add Interaction"</strong> or <strong>"Log Contact"</strong> button</Step>
            <Step number="4">Select the <strong>Type of Interaction</strong>:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Phone Call:</strong> You spoke on the telephone</li>
                <li><strong>Email:</strong> You exchanged emails</li>
                <li><strong>In-Person Visit:</strong> They came to the cemetery or office</li>
                <li><strong>Meeting:</strong> A scheduled appointment</li>
                <li><strong>Note:</strong> A general note to remember (no actual contact)</li>
                <li><strong>Other:</strong> Any other type of communication</li>
              </ul>
            </Step>
            <Step number="5">Write a <strong>brief summary</strong> of what was discussed:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>What did they want or ask about?</li>
                <li>What information did you provide?</li>
                <li>Were there any concerns or issues?</li>
                <li>What, if anything, needs to happen next?</li>
              </ul>
            </Step>
            <Step number="6">If you need to <strong>follow up</strong>:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Check the "Schedule Follow-Up" box</li>
                <li>Select the date you should contact them again</li>
                <li>Add a note about what the follow-up is for</li>
              </ul>
            </Step>
            <Step number="7">Click <strong>"Save"</strong> to record the interaction</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Managing Follow-Ups</h4>
            <p className="mb-2">The system will remind you when follow-ups are due:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Check the <strong>"Follow-Ups Due"</strong> section regularly</li>
              <li>Items turn <strong>red</strong> when they're overdue</li>
              <li>After completing a follow-up, mark it as "Completed"</li>
              <li>If you need more time, you can reschedule to a new date</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Viewing Contact History</h4>
            <Step number="1">Click on any contact's name</Step>
            <Step number="2">Their profile shows ALL past interactions in chronological order</Step>
            <Step number="3">You can see the complete story of your relationship with them</Step>
            <Step number="4">This is invaluable when they call and you need to remember past discussions</Step>

            <Tip>
              <strong>Log interactions right after they happen!</strong> Even a 30-second note 
              ("Called about plot availability, interested in Section B, will visit Saturday") 
              is incredibly helpful when they call back a week later.
            </Tip>

            <Tip>
              <strong>Set follow-ups generously!</strong> If someone says "I'll decide in a couple weeks," 
              set a follow-up for 2-3 weeks out. It's better to check in than to let them slip away.
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
            <p className="text-lg mb-4">
              <strong>The Task Management section is your to-do list for the cemetery.</strong> 
              Create tasks for yourself or assign them to other staff members. Set due dates, 
              track progress, and never forget an important job. The system will remind you 
              when tasks are due!
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Tasks" tab in the navigation bar</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Task List</h4>
            <p className="mb-2">The Tasks section shows all tasks organized by status:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Pending/To Do:</strong> Tasks that haven't been started yet</li>
              <li><strong>In Progress:</strong> Tasks someone is currently working on</li>
              <li><strong>Completed:</strong> Finished tasks (kept for records)</li>
              <li><strong>Overdue:</strong> Tasks past their due date (shown in red!)</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding Task Priority</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-800 text-xs rounded mr-2">Low</span> Can be done when there's time</li>
              <li><span className="inline-block px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded mr-2">Medium</span> Normal priority, do within the timeframe</li>
              <li><span className="inline-block px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded mr-2">High</span> Important - prioritize this task</li>
              <li><span className="inline-block px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded mr-2">Urgent</span> Drop everything - this needs immediate attention!</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Create a New Task</h4>
            <Step number="1">Click the <strong>"Add Task"</strong> button (usually green with a + icon)</Step>
            <Step number="2">Fill in the task details:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Title:</strong> A short, clear description of what needs to be done (e.g., "Repair fence near Section B")</li>
                <li><strong>Description:</strong> Additional details, instructions, or context</li>
                <li><strong>Due Date:</strong> Click the calendar and select when it should be completed</li>
                <li><strong>Priority:</strong> Select Low, Medium, High, or Urgent</li>
                <li><strong>Assign To:</strong> Choose who should do this task (yourself or another staff member)</li>
                <li><strong>Related To:</strong> Optionally link to a member, plot, or other record</li>
              </ul>
            </Step>
            <Step number="3">Review the information to make sure it's clear</Step>
            <Step number="4">Click <strong>"Save Task"</strong> to create it</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Complete a Task</h4>
            <p className="mb-2">When you finish a task, mark it complete:</p>
            <Step number="1">Find the task in your list</Step>
            <Step number="2"><strong>Quick Method:</strong> Click the checkbox or circle icon next to the task title</Step>
            <Step number="3"><strong>Detailed Method:</strong> Click on the task to open it, then click <strong>"Mark Complete"</strong></Step>
            <Step number="4">The task moves to the "Completed" section and is kept for your records</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Updating a Task's Status</h4>
            <Step number="1">Click on the task to open it</Step>
            <Step number="2">Click <strong>"Edit"</strong></Step>
            <Step number="3">Change the status (Pending → In Progress, for example)</Step>
            <Step number="4">Add notes about progress if helpful</Step>
            <Step number="5">Click <strong>"Save"</strong></Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Logging Time on a Task</h4>
            <p className="mb-2">If you need to track how much time was spent:</p>
            <Step number="1">Open the task</Step>
            <Step number="2">Click <strong>"Log Time"</strong></Step>
            <Step number="3">Enter the hours and minutes spent</Step>
            <Step number="4">Add a note about what was done (optional)</Step>
            <Step number="5">Click <strong>"Save"</strong></Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Task Notifications and Reminders</h4>
            <p className="mb-2">The system automatically notifies you when:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>A new task is assigned to you</li>
              <li>A task's due date is approaching (usually 1 day before)</li>
              <li>A task becomes overdue</li>
              <li>Someone updates a task you're assigned to</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Filtering and Finding Tasks</h4>
            <Step number="1">Use the <strong>Status tabs</strong> to switch between Pending, In Progress, Completed</Step>
            <Step number="2">Use the <strong>Search box</strong> to find tasks by keyword</Step>
            <Step number="3">Use <strong>Filters</strong> to show only certain priorities or assignees</Step>

            <Tip>
              <strong>Be specific in task titles!</strong> Instead of "Fix headstone," write 
              "Repair damaged headstone - Johnson family, Section A, Row 3." This makes it clear 
              exactly what needs to be done.
            </Tip>

            <Tip>
              <strong>Set realistic due dates!</strong> It's better to set a reasonable deadline 
              and finish early than to have a long list of overdue tasks. Overdue tasks can 
              become overwhelming!
            </Tip>
          </ManualSection>

          {/* MEMBERS */}
          <ManualSection icon={Users} title="Member Directory">
            <p className="text-lg mb-4">
              <strong>The Member Directory is your central hub for managing all cemetery association members.</strong> 
              View contact information, track donations, assign follow-ups, and manage member roles all in one place.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Members" tab in the navigation bar</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Member Directory Layout</h4>
            <p className="mb-2">When you open the Member Directory, you'll see:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Search Bar:</strong> Quickly find members by typing their name or city</li>
              <li><strong>Filter Dropdowns:</strong> Narrow down the list by Role, State, Donation status, and Follow-up status</li>
              <li><strong>Action Buttons:</strong> Audit Log, Export CSV, and Add Member buttons in the top right</li>
              <li><strong>Member Table:</strong> A sortable list showing all member information</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Using the Filter Dropdowns</h4>
            <p className="mb-2">The filter bar has several dropdowns to help you find specific members:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>All Roles:</strong> Filter by member role - Administrator, President, Vice President, Caretaker, Secretary, Treasurer, Legal, Member, or Associate</li>
              <li><strong>All States:</strong> Filter by the member's state (e.g., LA, TX)</li>
              <li><strong>All Members:</strong> Filter by donation status - Donors Only or Non-Donors</li>
              <li><strong>All Status:</strong> Filter by follow-up status - Due/Overdue or Pending</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding Member Roles</h4>
            <p className="mb-2">Each member can be assigned a role that appears as a colored badge in the table:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full mr-2">President</span> The association president</li>
              <li><span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full mr-2">Vice President</span> The vice president</li>
              <li><span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full mr-2">Treasurer</span> Handles finances</li>
              <li><span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full mr-2">Secretary</span> Handles records and correspondence</li>
              <li><span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full mr-2">Caretaker</span> Grounds and maintenance</li>
              <li><span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full mr-2">Legal</span> Legal counsel</li>
              <li><span className="inline-block px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full mr-2">Administrator</span> System administrator</li>
              <li><span className="inline-block px-2 py-0.5 bg-stone-50 text-stone-500 text-xs rounded-full mr-2">Member</span> Regular association member</li>
              <li><span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full mr-2">Associate</span> Associate member</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Finding a Member</h4>
            <Step number="1">Use the <strong>search box</strong> to type a name or city - results filter as you type</Step>
            <Step number="2">Use the <strong>Role dropdown</strong> to show only members with a specific role (e.g., "President")</Step>
            <Step number="3">Use other filters to narrow by state, donation status, or follow-up status</Step>
            <Step number="4">Click on column headers (Last Name, First Name, Role, City, State, Donation) to sort the list</Step>
            <Step number="5">Click on a member's row to view their full profile</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Adding a New Member</h4>
            <Step number="1">Click the <strong>"Add Member"</strong> button (teal button with + icon)</Step>
            <Step number="2">Fill in the member's information:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>First Name / Last Name:</strong> The member's full name</li>
                <li><strong>Role:</strong> Select their role from the dropdown (President, Vice President, Caretaker, Secretary, Treasurer, Legal, Administrator, Member, or Associate)</li>
                <li><strong>Address, City, State, ZIP:</strong> Mailing address</li>
                <li><strong>Primary Phone / Secondary Phone:</strong> Contact numbers</li>
                <li><strong>Primary Email / Secondary Email:</strong> Email addresses</li>
                <li><strong>Donation:</strong> Donation amount or type</li>
                <li><strong>Comments:</strong> Any additional notes</li>
              </ul>
            </Step>
            <Step number="3">Fill in tracking information if needed:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Last Donation Date:</strong> When they last donated</li>
                <li><strong>Last Contact Date:</strong> When you last communicated</li>
                <li><strong>Follow-up Date:</strong> When to follow up next</li>
                <li><strong>Follow-up Status:</strong> Pending, Completed, or Cancelled</li>
                <li><strong>Follow-up Notes:</strong> What the follow-up is about</li>
                <li><strong>Assign To:</strong> Which employee should handle the follow-up</li>
              </ul>
            </Step>
            <Step number="4">Click <strong>"Save Member"</strong> to add them to the directory</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Editing a Member</h4>
            <Step number="1">Find the member in the list</Step>
            <Step number="2">Click the <strong>pencil icon</strong> in the Actions column, OR click on the row to open their profile and then click Edit</Step>
            <Step number="3">Make your changes (update role, contact info, follow-up details, etc.)</Step>
            <Step number="4">Click <strong>"Save Member"</strong></Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Member Profile Contents</h4>
            <p className="mb-2">Click on any member's row to open their detailed profile, which shows:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Complete contact information (all phones, emails, address)</li>
              <li>Their assigned role in the organization</li>
              <li>Donation history and amounts</li>
              <li>Follow-up schedule and status</li>
              <li>Documents they've uploaded or signed</li>
              <li>Communication and contact history</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Exporting Member Data</h4>
            <Step number="1">Apply any filters you want (the export will include only filtered results)</Step>
            <Step number="2">Click the <strong>"Export CSV"</strong> button</Step>
            <Step number="3">A CSV file downloads with all member data including their role</Step>
            <Step number="4">Open in Excel or Google Sheets for reporting</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Viewing the Audit Log</h4>
            <p className="mb-2">Click the <strong>"Audit Log"</strong> button to see a history of all member changes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Who was added, updated, or deleted</li>
              <li>When the change was made</li>
              <li>Who made the change</li>
              <li>Details about what changed</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Bulk Actions</h4>
            <p className="mb-2">To perform actions on multiple members at once:</p>
            <Step number="1">Check the checkboxes next to the members you want to select</Step>
            <Step number="2">A blue bar appears showing how many are selected</Step>
            <Step number="3">Click <strong>"Bulk Actions"</strong> to send communications or update multiple records</Step>

            <Tip>
              <strong>Use the Role filter to quickly find board members!</strong> Select "President" or "Treasurer" 
              from the All Roles dropdown to instantly see only those with that role.
            </Tip>

            <Tip>
              <strong>Keep member information current!</strong> If someone's phone number or address changes, 
              update it right away. Accurate contact information is essential for important communications.
            </Tip>

            <Tip>
              <strong>Set follow-up reminders!</strong> When you speak with a member, set a follow-up date 
              to check in with them later. The system will remind you when it's due.
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
            <p className="text-lg mb-4">
              <strong>The Backups section protects all your cemetery data.</strong> 
              Creating regular backups ensures that if anything ever goes wrong - 
              computer problems, accidental deletions, or other issues - you can 
              recover your information. This is one of the most important things you can do!
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Backups" tab, or click the "Backups" button in the header</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800"><strong>⚠️ Important:</strong> Creating backups is one of your most critical responsibilities! 
              Without backups, data could be permanently lost. Make this a regular habit.</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">What Gets Backed Up?</h4>
            <p className="mb-2">A backup saves everything in the system:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>All member and family records</li>
              <li>All deceased records</li>
              <li>All plot information and statuses</li>
              <li>All reservations and payment records</li>
              <li>All employee information</li>
              <li>All tasks, events, and announcements</li>
              <li>All system settings</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">How to Create a Manual Backup</h4>
            <Step number="1">Go to the <strong>Backups</strong> tab</Step>
            <Step number="2">Click the <strong>"Create Backup"</strong> button</Step>
            <Step number="3">Wait while the system prepares your data - this may take 1-2 minutes. A progress message will appear</Step>
            <Step number="4">When ready, a <strong>"Download"</strong> button appears. Click it</Step>
            <Step number="5">Your browser will download a file. Save it somewhere safe:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Your computer's Documents folder</li>
                <li>A USB flash drive</li>
                <li>An external hard drive</li>
                <li>A cloud service like Google Drive or Dropbox</li>
              </ul>
            </Step>
            <Step number="6">The file will be named something like "UnionSprings_Backup_2024-03-15.json"</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Backup Best Practices - PLEASE FOLLOW THESE!</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Create a backup at least once a week</strong> - set a reminder for the same day each week</li>
              <li><strong>Store backups in multiple locations</strong> - if one copy is lost, you have another</li>
              <li><strong>Keep backups for at least 6 months</strong> - sometimes you don't realize data is missing until later</li>
              <li><strong>Label your backups clearly</strong> - the file name includes the date, but you can also rename it</li>
              <li><strong>Test a restore occasionally</strong> - to make sure your backups actually work (ask for help with this)</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Automatic Backups</h4>
            <p className="mb-2">
              Good news: The system also creates automatic backups regularly. You can see these 
              in the Backups section. However, <strong>always create your own backups too</strong> - 
              having multiple copies protects you better.
            </p>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Restoring from a Backup</h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-semibold">
                ⚠️ <strong>WARNING:</strong> Restoring a backup will REPLACE all current data 
                with the data from the backup file! Only do this if something has gone seriously 
                wrong and you need to recover lost information. If unsure, contact support first!
              </p>
            </div>
            <Step number="1">Make sure you really need to restore (consider calling support first)</Step>
            <Step number="2">Click <strong>"Restore Backup"</strong></Step>
            <Step number="3">Click <strong>"Choose File"</strong> and select your backup file</Step>
            <Step number="4">The system will ask you to confirm - read the warning carefully</Step>
            <Step number="5">Type "CONFIRM" or check the confirmation box</Step>
            <Step number="6">Click <strong>"Restore"</strong> and wait for the process to complete</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Suggested Backup Schedule</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <ul className="space-y-2 text-green-800">
                <li>✓ <strong>Every Friday:</strong> Create a weekly backup before going home for the weekend</li>
                <li>✓ <strong>Before major changes:</strong> Create a backup before importing data or making big updates</li>
                <li>✓ <strong>Monthly:</strong> Copy your backup to an external drive and store it safely off-site</li>
              </ul>
            </div>

            <Tip>
              <strong>Set a calendar reminder!</strong> Every Friday at 4:00 PM, remind yourself to 
              create a backup. It only takes a minute and could save months of work!
            </Tip>

            <Tip>
              <strong>Keep a backup off-site!</strong> Store at least one recent backup somewhere 
              other than the cemetery office - at home, in a safe deposit box, or in the cloud. 
              This protects against theft, fire, or other disasters.
            </Tip>
          </ManualSection>

          {/* COMMUNICATIONS */}
          <ManualSection icon={Mail} title="Communications Center">
            <p className="text-lg mb-4">
              <strong>The Communications Center is your email and messaging hub.</strong> 
              View messages from the website contact form, send emails to members and families, 
              and keep track of all correspondence. This ensures no inquiry goes unanswered.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-medium">📍 <strong>How to Get Here:</strong> Click the "Communications" tab in the navigation bar</p>
            </div>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Understanding the Communications Layout</h4>
            <p className="mb-2">The Communications section typically shows:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Inbox:</strong> Messages received from the website contact form and member portal</li>
              <li><strong>Sent Messages:</strong> Emails you've sent (for your records)</li>
              <li><strong>Templates:</strong> Pre-written message templates for common situations</li>
              <li><strong>Compose:</strong> Where you write new emails</li>
            </ul>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Viewing and Responding to Incoming Messages</h4>
            <p className="mb-2">When someone fills out the Contact Form on your website, their message appears here:</p>
            <Step number="1">Look at the <strong>Inbox</strong> - new/unread messages usually appear in bold or have a colored indicator</Step>
            <Step number="2">Click on a message to open and read it</Step>
            <Step number="3">You'll see:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Who sent it (their name and email)</li>
                <li>When it was sent</li>
                <li>The subject line</li>
                <li>The full message content</li>
              </ul>
            </Step>
            <Step number="4">To respond, click the <strong>"Reply"</strong> button</Step>
            <Step number="5">Type your response in the message area</Step>
            <Step number="6">Click <strong>"Send"</strong> to email your response to them</Step>
            <Step number="7">After handling the inquiry, click <strong>"Mark as Handled"</strong> or <strong>"Archive"</strong></Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Sending a New Email</h4>
            <Step number="1">Click <strong>"Compose Email"</strong> or <strong>"New Message"</strong></Step>
            <Step number="2">In the <strong>"To"</strong> field:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Type an email address directly, OR</li>
                <li>Start typing a name to search for a member, OR</li>
                <li>Select from a dropdown of saved contacts</li>
              </ul>
            </Step>
            <Step number="3">Enter a clear <strong>Subject Line</strong> (e.g., "Your Plot Reservation Confirmation")</Step>
            <Step number="4">Write your message in the large <strong>Body</strong> area</Step>
            <Step number="5"><strong>Review your message carefully</strong> - check spelling and make sure it's complete</Step>
            <Step number="6">Click <strong>"Send"</strong> to deliver the email</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Using Email Templates</h4>
            <p className="mb-2">Templates are pre-written messages for common situations, saving you time:</p>
            <Step number="1">When composing an email, look for <strong>"Use Template"</strong> or a template icon</Step>
            <Step number="2">Click it to see available templates:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Reservation Confirmation</li>
                <li>Payment Reminder</li>
                <li>General Inquiry Response</li>
                <li>Event Invitation</li>
                <li>And others...</li>
              </ul>
            </Step>
            <Step number="3">Click on the template you want</Step>
            <Step number="4">The subject and body fill in automatically with placeholder text</Step>
            <Step number="5"><strong>Customize the message</strong> - replace placeholders like [NAME] with actual information</Step>
            <Step number="6">Review, then click <strong>"Send"</strong></Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Sending to Multiple People</h4>
            <p className="mb-2">To send the same message to several people:</p>
            <Step number="1">In the "To" field, add multiple email addresses separated by commas</Step>
            <Step number="2">Or look for a "Select Group" or "Select Segment" option</Step>
            <Step number="3">You can send to groups like "All Members" or custom segments you've created</Step>

            <h4 className="font-bold text-stone-800 mt-4 mb-2">Email Best Practices</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Clear subject lines:</strong> "Union Springs: Your Reservation is Confirmed" is better than "Hello"</li>
              <li><strong>Professional but warm:</strong> Be friendly and respectful</li>
              <li><strong>Answer all questions:</strong> If they asked multiple things, address each one</li>
              <li><strong>Include contact info:</strong> End with phone number in case they want to call</li>
            </ul>

            <Tip>
              <strong>Always proofread before sending!</strong> Read your email once more before clicking Send. 
              Once sent, you cannot take it back. Check for spelling errors and make sure all the 
              information is correct.
            </Tip>

            <Tip>
              <strong>Respond promptly!</strong> Try to answer messages within 24-48 hours. 
              Quick responses show families that Union Springs cares about them.
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