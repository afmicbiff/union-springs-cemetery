import React, { lazy, Suspense, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Lazy load all tab content - only load what's needed
const CRMContacts = lazy(() => import("./ContactsTable"));
const CRMInteractions = lazy(() => import("./CRMInteractions"));
const CRMSegments = lazy(() => import("./CRMSegments"));
const CRMFollowUps = lazy(() => import("./CRMFollowUps"));
const CRMAutomations = lazy(() => import("./CRMAutomations"));

const TabLoader = () => (
  <div className="py-12 flex items-center justify-center text-stone-400">
    <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading...
  </div>
);

export default function CRM() {
  const [activeTab, setActiveTab] = useState("contacts");

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">CRM</h2>
        <p className="text-sm text-stone-600">Manage members and follow-ups.</p>
      </div>

      <Card>
        <CardHeader className="pb-0 px-3 sm:px-6">
          <CardTitle className="sr-only">CRM</CardTitle>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-2 sm:p-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="contacts" className="text-xs sm:text-sm">Contacts</TabsTrigger>
            <TabsTrigger value="interactions" className="text-xs sm:text-sm">Interactions</TabsTrigger>
            <TabsTrigger value="segments" className="text-xs sm:text-sm">Segments</TabsTrigger>
            <TabsTrigger value="followups" className="text-xs sm:text-sm">Follow-ups</TabsTrigger>
            <TabsTrigger value="automations" className="text-xs sm:text-sm hidden sm:inline-flex">Automations</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-3 sm:mt-4">
            <Suspense fallback={<TabLoader />}><CRMContacts /></Suspense>
          </TabsContent>
          <TabsContent value="interactions" className="mt-3 sm:mt-4">
            <Suspense fallback={<TabLoader />}><CRMInteractions /></Suspense>
          </TabsContent>
          <TabsContent value="segments" className="mt-3 sm:mt-4">
            <Suspense fallback={<TabLoader />}><CRMSegments /></Suspense>
          </TabsContent>
          <TabsContent value="followups" className="mt-3 sm:mt-4">
            <Suspense fallback={<TabLoader />}><CRMFollowUps /></Suspense>
          </TabsContent>
          <TabsContent value="automations" className="mt-3 sm:mt-4">
            <Suspense fallback={<TabLoader />}><CRMAutomations /></Suspense>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}