import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import CRMContacts from "./ContactsTable";
import CRMInteractions from "./CRMInteractions";
import CRMSegments from "./CRMSegments";
import CRMFollowUps from "./CRMFollowUps";
import CRMAutomations from "./CRMAutomations";

export default function CRM() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-serif font-bold text-stone-900">CRM</h2>
        <p className="text-stone-600">Manage members, interactions, segments, and follow-ups.</p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="sr-only">CRM</CardTitle>
        </CardHeader>
        <Tabs defaultValue="contacts" className="p-4">
          <TabsList>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="followups">Follow-ups</TabsTrigger>
            <TabsTrigger value="automations">Automations</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-4">
            <CRMContacts />
          </TabsContent>
          <TabsContent value="interactions" className="mt-4">
            <CRMInteractions />
          </TabsContent>
          <TabsContent value="segments" className="mt-4">
            <CRMSegments />
          </TabsContent>
          <TabsContent value="followups" className="mt-4">
            <CRMFollowUps />
          </TabsContent>
          <TabsContent value="automations" className="mt-4">
            <CRMAutomations />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}