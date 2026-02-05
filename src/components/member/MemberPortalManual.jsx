import React, { useState, memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  BookOpen, LayoutDashboard, UserCircle, MessageSquare, FileText, CheckCircle2,
  Receipt, MapPin, ChevronDown, ChevronRight, HelpCircle, Phone, Mail,
  ArrowRight, Eye, Pencil, Upload, Send, Search, LogOut, Bell, AlertCircle,
  Printer, Home, X
} from 'lucide-react';

// Section component with collapsible functionality
const ManualSection = memo(function ManualSection({ 
  icon: Icon, 
  title, 
  description, 
  children, 
  defaultOpen = false,
  sectionNumber
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-stone-200 rounded-lg overflow-hidden">
      <CollapsibleTrigger className="w-full">
        <div className={`flex items-center justify-between p-4 sm:p-5 hover:bg-stone-50 transition-colors ${isOpen ? 'bg-teal-50 border-b border-stone-200' : 'bg-white'}`}>
          <div className="flex items-center gap-3 sm:gap-4 text-left">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${isOpen ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'}`}>
              {sectionNumber ? (
                <span className="text-lg sm:text-xl font-bold">{sectionNumber}</span>
              ) : (
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-stone-900">{title}</h3>
              <p className="text-xs sm:text-sm text-stone-600">{description}</p>
            </div>
          </div>
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-stone-400" />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 sm:p-6 bg-white space-y-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

// Step component for numbered instructions
const Step = memo(function Step({ number, title, children, icon: Icon }) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
          {number}
        </div>
        <div className="flex-1 w-0.5 bg-teal-200 mt-2" />
      </div>
      <div className="pb-6 sm:pb-8 flex-1">
        <div className="flex items-center gap-2 mb-2">
          {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />}
          <h4 className="font-semibold text-stone-900 text-sm sm:text-base">{title}</h4>
        </div>
        <div className="text-sm sm:text-base text-stone-700 leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
});

// Tip/Note component
const Tip = memo(function Tip({ type = 'tip', children }) {
  const config = {
    tip: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: HelpCircle, label: 'Helpful Tip' },
    important: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: AlertCircle, label: 'Important' },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: CheckCircle2, label: 'Good to Know' }
  };
  const { bg, border, text, icon: Icon, label } = config[type];
  
  return (
    <div className={`${bg} ${border} border rounded-lg p-3 sm:p-4 flex gap-3`}>
      <Icon className={`w-5 h-5 ${text} shrink-0 mt-0.5`} />
      <div>
        <span className={`font-semibold ${text} text-sm`}>{label}:</span>
        <p className={`${text} text-sm mt-1`}>{children}</p>
      </div>
    </div>
  );
});

// Visual button example
const ButtonExample = memo(function ButtonExample({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-teal-700 text-white',
    outline: 'border-2 border-stone-300 text-stone-700',
    ghost: 'text-stone-600'
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
});

const MemberPortalManual = memo(function MemberPortalManual({ onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = useCallback(() => {
    if (onClose) onClose(dontShowAgain);
  }, [onClose, dontShowAgain]);

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-stone-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-t-lg px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl md:text-3xl font-serif">Member Portal User Guide</CardTitle>
                <CardDescription className="text-teal-100 mt-1 text-sm sm:text-base">
                  Step-by-step instructions for using your member account
                </CardDescription>
              </div>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20 shrink-0">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Quick Start Guide */}
          <div className="bg-stone-50 rounded-lg p-4 sm:p-6 border border-stone-200">
            <h2 className="text-lg sm:text-xl font-semibold text-stone-900 mb-3 flex items-center gap-2">
              <Home className="w-5 h-5 text-teal-600" /> Quick Start: Getting Around
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <LayoutDashboard className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Dashboard</span>
                  <p className="text-stone-600 text-xs sm:text-sm">Your home page - see action items and plot summary</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <UserCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">My Profile</span>
                  <p className="text-stone-600 text-xs sm:text-sm">Update your contact information</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <MessageSquare className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Messages</span>
                  <p className="text-stone-600 text-xs sm:text-sm">Send and receive messages from administration</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <FileText className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Documents</span>
                  <p className="text-stone-600 text-xs sm:text-sm">Upload and manage your important documents</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Tasks</span>
                  <p className="text-stone-600 text-xs sm:text-sm">View and complete tasks assigned to you</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <Receipt className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Invoices</span>
                  <p className="text-stone-600 text-xs sm:text-sm">View your payment history and balances</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="space-y-3 sm:space-y-4">
            
            {/* Section 1: Logging In */}
            <ManualSection
              sectionNumber="1"
              icon={LogOut}
              title="Logging In to Your Account"
              description="How to access your member portal"
              defaultOpen={true}
            >
              <Step number={1} title="Go to the Member Portal Page" icon={Home}>
                <p>Open your web browser (Chrome, Safari, Firefox, or Edge) and go to the Union Springs Cemetery website.</p>
                <p className="mt-2">Click on <strong>"Admin Dashboard"</strong> in the top menu, then select <strong>"Member Portal/Account"</strong>.</p>
              </Step>
              
              <Step number={2} title="Click the Log In Button" icon={ArrowRight}>
                <p>You will see a white box in the center of the screen with a <strong>"Log In"</strong> button.</p>
                <p className="mt-2">Click the large teal <ButtonExample>Log In</ButtonExample> button.</p>
              </Step>
              
              <Step number={3} title="Enter Your Credentials" icon={UserCircle}>
                <p>A login screen will appear. Enter:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li><strong>Email Address:</strong> The email you registered with</li>
                  <li><strong>Password:</strong> Your account password</li>
                </ul>
                <p className="mt-2">Click <strong>"Sign In"</strong> or <strong>"Log In"</strong> to continue.</p>
              </Step>
              
              <Step number={4} title="You're In!" icon={CheckCircle2}>
                <p>After logging in, you will see your Dashboard with a welcome message showing your name.</p>
              </Step>
              
              <Tip type="tip">
                If you forgot your password, look for a "Forgot Password?" link on the login screen. An email will be sent to reset it.
              </Tip>
            </ManualSection>

            {/* Section 2: Dashboard */}
            <ManualSection
              sectionNumber="2"
              icon={LayoutDashboard}
              title="Using the Dashboard"
              description="Your home page overview and action items"
            >
              <p className="text-stone-700 mb-4">
                The Dashboard is your home page. It shows you important information at a glance and any items that need your attention.
              </p>
              
              <Step number={1} title="View Action Items" icon={AlertCircle}>
                <p>At the top of the Dashboard, you'll see a box labeled <strong>"Action Items"</strong>.</p>
                <p className="mt-2">This shows:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li><strong>Pending Reservations:</strong> Reservations waiting for approval</li>
                  <li><strong>Profile Incomplete:</strong> Reminder to update your contact info</li>
                  <li><strong>Unread Notifications:</strong> New messages or alerts</li>
                </ul>
                <p className="mt-2">Click the <strong>"View"</strong> button next to any item to go directly to that section.</p>
              </Step>
              
              <Step number={2} title="View Your Plots" icon={MapPin}>
                <p>Below the Action Items, you'll see a <strong>"My Plots"</strong> card.</p>
                <p className="mt-2">This shows all plots you own or have confirmed reservations for, including:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li>Plot number and location</li>
                  <li>Status (Owned, Pending, etc.)</li>
                </ul>
              </Step>
              
              <Step number={3} title="View Recent Requests" icon={Eye}>
                <p>The <strong>"Recent Requests"</strong> card shows any pending applications you have submitted.</p>
                <p className="mt-2">You can see if they are awaiting review or have been processed.</p>
              </Step>
              
              <Step number={4} title="Refresh the Page" icon={ArrowRight}>
                <p>To see the latest information, click the circular arrow button (↻) at the top right of the Action Items box.</p>
              </Step>
              
              <Tip type="success">
                Check your Dashboard regularly to stay up-to-date on any pending items that need your attention.
              </Tip>
            </ManualSection>

            {/* Section 3: My Profile */}
            <ManualSection
              sectionNumber="3"
              icon={UserCircle}
              title="Updating Your Profile"
              description="Keep your contact information current"
            >
              <p className="text-stone-700 mb-4">
                Your profile contains your personal contact information. Keeping this updated helps the cemetery administration reach you when needed.
              </p>
              
              <Step number={1} title="Go to My Profile" icon={ArrowRight}>
                <p>Click on the <strong>"My Profile"</strong> tab at the top of the page.</p>
                <p className="mt-2">You will see a form with your current information.</p>
              </Step>
              
              <Step number={2} title="Update Your Information" icon={Pencil}>
                <p>Click inside any field to edit it. You can update:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li><strong>First Name</strong> and <strong>Last Name</strong> (Required)</li>
                  <li><strong>Primary Phone</strong> (Required)</li>
                  <li><strong>Street Address, City, State, Zip</strong> (Required)</li>
                  <li><strong>Secondary Email</strong> (Optional)</li>
                  <li><strong>Secondary Phone</strong> (Optional)</li>
                  <li><strong>Additional Notes</strong> (Optional)</li>
                </ul>
              </Step>
              
              <Step number={3} title="Save Your Changes" icon={CheckCircle2}>
                <p>After making your changes, scroll down and click the <ButtonExample>Save Changes</ButtonExample> button.</p>
                <p className="mt-2">A green message will appear saying <strong>"Profile updated successfully"</strong> when saved.</p>
              </Step>
              
              <Tip type="important">
                Fields marked with a red asterisk (*) are required. You must fill these in to save your profile.
              </Tip>
              
              <Tip type="tip">
                Your email address cannot be changed here. If you need to update your email, please contact administration.
              </Tip>
            </ManualSection>

            {/* Section 4: Messages */}
            <ManualSection
              sectionNumber="4"
              icon={MessageSquare}
              title="Sending and Receiving Messages"
              description="Communicate with cemetery administration"
            >
              <p className="text-stone-700 mb-4">
                The Messages feature lets you communicate directly with the cemetery administration. You can ask questions, report issues, or make inquiries.
              </p>
              
              <Step number={1} title="Go to Messages" icon={ArrowRight}>
                <p>Click on the <strong>"Messages"</strong> tab at the top of the page.</p>
                <p className="mt-2">If you have unread messages, you will see a number badge on the tab.</p>
              </Step>
              
              <Step number={2} title="Start a New Inquiry" icon={Send}>
                <p>To send a new message to administration:</p>
                <ol className="list-decimal list-inside mt-2 space-y-2 ml-2">
                  <li>Click the <ButtonExample>+ New Inquiry</ButtonExample> button in the top right</li>
                  <li>A popup window will appear</li>
                  <li>Enter a <strong>Subject</strong> (example: "Question About Plot Maintenance")</li>
                  <li>Type your <strong>Message</strong> in the large text box</li>
                  <li>Click <strong>"Send Inquiry"</strong></li>
                </ol>
              </Step>
              
              <Step number={3} title="Read Your Messages" icon={Eye}>
                <p><strong>On a Computer:</strong> Your message threads appear on the left side. Click on any thread to read it.</p>
                <p className="mt-2"><strong>On a Phone:</strong> Tap a thread to open it. Use the back arrow (←) to return to the list.</p>
                <p className="mt-2">Messages from you appear on the right (teal color). Messages from admin appear on the left (white).</p>
              </Step>
              
              <Step number={4} title="Reply to a Message" icon={Send}>
                <p>To reply to a conversation:</p>
                <ol className="list-decimal list-inside mt-2 space-y-2 ml-2">
                  <li>Click on the message thread you want to reply to</li>
                  <li>Scroll to the bottom of the conversation</li>
                  <li>Type your reply in the text box</li>
                  <li>Click the <strong>send arrow button</strong> (→)</li>
                </ol>
              </Step>
              
              <Step number={5} title="Delete a Thread" icon={X}>
                <p>To delete a conversation:</p>
                <p className="mt-2">Click the small trash can icon next to the thread in the list.</p>
              </Step>
              
              <Tip type="tip">
                A red dot next to a thread means you have unread messages. The dot disappears after you view the thread.
              </Tip>
            </ManualSection>

            {/* Section 5: Documents */}
            <ManualSection
              sectionNumber="5"
              icon={FileText}
              title="Managing Your Documents"
              description="Upload, view, and sign important documents"
            >
              <p className="text-stone-700 mb-4">
                The Documents section lets you securely upload, store, and manage important documents like IDs, deeds, certificates, and family records.
              </p>
              
              <Step number={1} title="Go to Documents" icon={ArrowRight}>
                <p>Click on the <strong>"Documents"</strong> tab at the top of the page.</p>
              </Step>
              
              <Step number={2} title="Upload a New Document" icon={Upload}>
                <p>To upload a document:</p>
                <ol className="list-decimal list-inside mt-2 space-y-2 ml-2">
                  <li><strong>Document Type:</strong> Select what kind of document it is (Will, Deed, ID, etc.)</li>
                  <li><strong>Category:</strong> Choose a category (Legal, Identification, etc.)</li>
                  <li><strong>Expiration Date:</strong> If the document expires (like an ID), enter the date (optional)</li>
                  <li><strong>Select File:</strong> Click the "Choose File" button and find the file on your computer or phone</li>
                  <li><strong>Notes:</strong> Add any helpful notes about the document (optional)</li>
                </ol>
                <p className="mt-2">The upload starts automatically after you select the file.</p>
              </Step>
              
              <Step number={3} title="View Your Documents" icon={Eye}>
                <p>All your uploaded documents appear in a list below the upload form.</p>
                <p className="mt-2">Each document shows:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li>Document name</li>
                  <li>Version number (v1, v2, etc.)</li>
                  <li>Type and category</li>
                  <li>Upload date</li>
                  <li>Expiration date (if set) — expired documents show in red</li>
                </ul>
              </Step>
              
              <Step number={4} title="Download a Document" icon={ArrowRight}>
                <p>Click the <strong>"Download"</strong> or <strong>"View"</strong> button next to any document to open it.</p>
              </Step>
              
              <Step number={5} title="Sign a Document" icon={Pencil}>
                <p>If you need to sign a document electronically:</p>
                <ol className="list-decimal list-inside mt-2 space-y-2 ml-2">
                  <li>Click the <strong>"Sign"</strong> button next to the document</li>
                  <li>A signature popup will appear</li>
                  <li>Draw your signature using your mouse or finger (on touch screens)</li>
                  <li>Click <strong>"Save Signature"</strong></li>
                </ol>
                <p className="mt-2">Signed documents will show a green "Signed" badge.</p>
              </Step>
              
              <Step number={6} title="Upload a New Version" icon={Upload}>
                <p>If you need to replace a document with an updated version:</p>
                <ol className="list-decimal list-inside mt-2 space-y-2 ml-2">
                  <li>Click <strong>"New Ver"</strong> next to the document</li>
                  <li>Select the new file from your computer</li>
                </ol>
                <p className="mt-2">The new version will be saved and the version number will increase (v2, v3, etc.).</p>
              </Step>
              
              <Step number={7} title="Delete a Document" icon={X}>
                <p>Click the red trash can icon to remove a document. <strong>This cannot be undone.</strong></p>
              </Step>
              
              <Tip type="important">
                Documents are securely stored. All uploaded files go through a security scan before being saved.
              </Tip>
            </ManualSection>

            {/* Section 6: Tasks */}
            <ManualSection
              sectionNumber="6"
              icon={CheckCircle2}
              title="Completing Your Tasks"
              description="View and manage tasks assigned to you"
            >
              <p className="text-stone-700 mb-4">
                The Tasks section shows any action items assigned to you by the cemetery administration. This might include forms to complete, documents to provide, or other follow-up items.
              </p>
              
              <Step number={1} title="Go to Tasks" icon={ArrowRight}>
                <p>Click on the <strong>"Tasks"</strong> tab at the top of the page.</p>
                <p className="mt-2">If you have tasks due, you will see a number badge on the tab.</p>
              </Step>
              
              <Step number={2} title="View Your Tasks" icon={Eye}>
                <p>Your tasks are listed with the following information:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li><strong>Title:</strong> What the task is about</li>
                  <li><strong>Description:</strong> Details about what you need to do</li>
                  <li><strong>Priority:</strong> Low, Medium, or High importance</li>
                  <li><strong>Due Date:</strong> When the task should be completed (overdue tasks show in red)</li>
                  <li><strong>Status:</strong> To Do, In Progress, or Completed</li>
                </ul>
              </Step>
              
              <Step number={3} title="Search and Filter Tasks" icon={Search}>
                <p>Use the search box to find specific tasks by name.</p>
                <p className="mt-2">Use the filter buttons to show:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li><strong>All:</strong> All your tasks</li>
                  <li><strong>To Do:</strong> Tasks not yet started</li>
                  <li><strong>Doing:</strong> Tasks in progress</li>
                  <li><strong>Done:</strong> Completed tasks</li>
                </ul>
              </Step>
              
              <Step number={4} title="Mark a Task Complete" icon={CheckCircle2}>
                <p>When you finish a task:</p>
                <ol className="list-decimal list-inside mt-2 space-y-2 ml-2">
                  <li>Click the <strong>circle icon</strong> on the left side of the task, OR</li>
                  <li>Click the <strong>"Mark Complete"</strong> button on the right</li>
                </ol>
                <p className="mt-2">The task will show a green checkmark and move to the "Done" list.</p>
              </Step>
              
              <Step number={5} title="Reopen a Completed Task" icon={ArrowRight}>
                <p>If you need to reopen a task you marked complete by mistake:</p>
                <p className="mt-2">Click the checkmark icon or <strong>"Mark To Do"</strong> button to change it back.</p>
              </Step>
              
              <Tip type="important">
                Tasks with past due dates appear in red. Please complete these as soon as possible.
              </Tip>
            </ManualSection>

            {/* Section 7: Invoices */}
            <ManualSection
              sectionNumber="7"
              icon={Receipt}
              title="Viewing Your Invoices"
              description="Payment history and outstanding balances"
            >
              <p className="text-stone-700 mb-4">
                The Invoices section shows your payment history and any outstanding balances for plot reservations, fees, or other charges.
              </p>
              
              <Step number={1} title="Go to Invoices" icon={ArrowRight}>
                <p>Click on the <strong>"Invoices"</strong> tab at the top of the page.</p>
              </Step>
              
              <Step number={2} title="Understand Invoice Status" icon={Eye}>
                <p>Each invoice shows a colored status badge:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li><Badge className="bg-green-100 text-green-800 mx-1">Paid</Badge> — Payment received</li>
                  <li><Badge className="bg-amber-100 text-amber-800 mx-1">Pending</Badge> — Awaiting payment</li>
                  <li><Badge className="bg-red-100 text-red-800 mx-1">Overdue</Badge> — Past the due date</li>
                  <li><Badge className="bg-stone-100 text-stone-800 mx-1">Cancelled</Badge> — No longer required</li>
                </ul>
              </Step>
              
              <Step number={3} title="View Invoice Details" icon={Eye}>
                <p>Each invoice shows:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li><strong>Title:</strong> What the charge is for</li>
                  <li><strong>Invoice Number:</strong> Reference number (example: #INV-12345)</li>
                  <li><strong>Due Date:</strong> When payment is expected</li>
                  <li><strong>Amount:</strong> How much is owed</li>
                  <li><strong>Description:</strong> Additional details</li>
                </ul>
              </Step>
              
              <Tip type="important">
                If you have overdue invoices, please contact administration to arrange payment.
              </Tip>
            </ManualSection>

            {/* Section 8: Reservations */}
            <ManualSection
              sectionNumber="8"
              icon={MapPin}
              title="Making a Plot Reservation"
              description="Reserve a cemetery plot step by step"
            >
              <p className="text-stone-700 mb-4">
                The Reservations section lets you request a new plot and view your existing reservations.
              </p>
              
              <Step number={1} title="Go to Reservations" icon={ArrowRight}>
                <p>Click on the <strong>"Reservations"</strong> tab at the top of the page.</p>
                <p className="mt-2">You will see two sections: the Reservation Wizard and Your Reservations History.</p>
              </Step>
              
              <Step number={2} title="Start a New Reservation (Step 1: Select Plot)" icon={MapPin}>
                <p>In the <strong>"Reserve a Plot (Wizard)"</strong> section:</p>
                <ol className="list-decimal list-inside mt-2 space-y-2 ml-2">
                  <li>Use the search box to find a specific plot by number, name, or row</li>
                  <li>Use the Section dropdown to filter by cemetery section</li>
                  <li>Browse the list of available plots</li>
                  <li>Click on a plot to select it (it will highlight in teal)</li>
                  <li>Click <ButtonExample>Continue <ArrowRight className="w-3 h-3" /></ButtonExample></li>
                </ol>
              </Step>
              
              <Step number={3} title="Accept Terms (Step 2: Terms)" icon={CheckCircle2}>
                <p>Read and accept the required agreements by checking each box:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li>☐ Terms & Conditions</li>
                  <li>☐ Rules & Regulations</li>
                  <li>☐ Schedule of Fees</li>
                </ul>
                <p className="mt-2">You must check all three boxes to continue.</p>
                <p className="mt-2">Click <ButtonExample>Continue <ArrowRight className="w-3 h-3" /></ButtonExample> to proceed.</p>
              </Step>
              
              <Step number={4} title="Complete Payment Info (Step 3: Payment)" icon={Receipt}>
                <p>On the final step:</p>
                <ol className="list-decimal list-inside mt-2 space-y-2 ml-2">
                  <li>Enter the <strong>Donation / Plot Fee</strong> amount (if applicable)</li>
                  <li>Verify your email address is correct</li>
                  <li>Click <ButtonExample>Submit & Create Invoice</ButtonExample></li>
                </ol>
                <p className="mt-2">An invoice will be created and you can view it in the Invoices tab.</p>
              </Step>
              
              <Step number={5} title="View Your Reservation History" icon={Eye}>
                <p>Below the wizard, the <strong>"My Plot Reservations"</strong> section shows all your reservations.</p>
                <p className="mt-2">Each reservation shows:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li><strong>Plot ID</strong></li>
                  <li><strong>Request Date</strong></li>
                  <li><strong>Status:</strong> Pending Review, Confirmed, or Rejected</li>
                  <li><strong>Payment Status:</strong> Pending, Paid, or Failed</li>
                  <li><strong>Amount</strong> (if applicable)</li>
                </ul>
              </Step>
              
              <Step number={6} title="Actions for Confirmed Reservations" icon={Pencil}>
                <p>Once a reservation is confirmed, additional buttons appear:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li><strong>Sign Certificate:</strong> Electronically sign your burial certificate</li>
                  <li><strong>Request Transfer:</strong> Transfer the plot to another family member</li>
                  <li><strong>Maintenance:</strong> View maintenance history for the plot</li>
                </ul>
              </Step>
              
              <Tip type="tip">
                Make sure your profile is complete before making a reservation. This ensures your invoices are created correctly.
              </Tip>
            </ManualSection>

            {/* Section 9: Logging Out */}
            <ManualSection
              sectionNumber="9"
              icon={LogOut}
              title="Logging Out Safely"
              description="How to sign out of your account"
            >
              <Step number={1} title="Find the Log Out Button" icon={LogOut}>
                <p>The <strong>"Log Out"</strong> button is located at the top right of the page.</p>
                <p className="mt-2">On phones, it may show only as an icon (⎋) without text.</p>
              </Step>
              
              <Step number={2} title="Click Log Out" icon={ArrowRight}>
                <p>Click the <ButtonExample variant="outline"><LogOut className="w-3 h-3" /> Log Out</ButtonExample> button.</p>
                <p className="mt-2">You will be signed out and returned to the login screen.</p>
              </Step>
              
              <Tip type="important">
                Always log out when using a public or shared computer to keep your account secure.
              </Tip>
            </ManualSection>

          </div>

          {/* Need Help Section */}
          <div className="bg-teal-50 rounded-lg p-4 sm:p-6 border border-teal-200 mt-6">
            <h2 className="text-lg sm:text-xl font-semibold text-teal-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Need More Help?
            </h2>
            <p className="text-teal-800 mb-4 text-sm sm:text-base">
              If you have questions or need assistance, please contact us:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-teal-200">
                <Phone className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="font-medium text-teal-900 text-sm sm:text-base">Darrell Clendennen</p>
                  <p className="text-teal-700 text-sm">(540) 760-8863</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-teal-200">
                <Phone className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="font-medium text-teal-900 text-sm sm:text-base">RD Teutsch</p>
                  <p className="text-teal-700 text-sm">(318) 846-2201</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-teal-200 sm:col-span-2">
                <Mail className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="font-medium text-teal-900 text-sm sm:text-base">Send us a message</p>
                  <p className="text-teal-700 text-sm">Use the Messages tab in your portal, or email us directly</p>
                </div>
              </div>
            </div>
          </div>

          {/* Print Button */}
          <div className="flex justify-center pt-4">
            <Button 
              variant="outline" 
              onClick={() => window.print()} 
              className="gap-2 h-10 text-sm touch-manipulation"
            >
              <Printer className="w-4 h-4" /> Print This Guide
            </Button>
          </div>

          {/* Don't Show Again + Close */}
          {onClose && (
            <div className="mt-6 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="dont-show-again" 
                  checked={dontShowAgain} 
                  onCheckedChange={setDontShowAgain}
                />
                <Label htmlFor="dont-show-again" className="text-sm text-stone-600 cursor-pointer">
                  Don't show this guide automatically on login
                </Label>
              </div>
              <Button onClick={handleClose} className="bg-teal-700 hover:bg-teal-800 h-10 px-6 touch-manipulation">
                Close Guide
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
});

export default MemberPortalManual;