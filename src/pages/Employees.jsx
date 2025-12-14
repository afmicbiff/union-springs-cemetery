import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import OnboardingForm from "@/components/admin/OnboardingForm";
import OnboardingGuide from "@/components/admin/OnboardingGuide";
import EmployeeDocumentManager from "@/components/admin/EmployeeDocumentManager";
import EmployeeList from "@/components/admin/EmployeeList";
import OnboardingProgress from "@/components/admin/OnboardingProgress";
import { Users } from 'lucide-react';

export default function Employees() {
  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-stone-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-teal-700" />
              Employee Management
            </h1>
            <p className="text-stone-600">Onboarding, Directory, and Documentation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column: New Hire Form */}
            <div className="xl:col-span-1 space-y-6">
                <OnboardingForm />
            </div>

            {/* Middle Column: Tracker & Docs */}
            <div className="xl:col-span-1 space-y-6">
                <OnboardingProgress />
                <EmployeeDocumentManager />
            </div>

            {/* Right Column: Guide */}
            <div className="xl:col-span-1">
                <OnboardingGuide />
            </div>
        </div>

        {/* Full Width: Employee List */}
        <div className="pt-6 border-t border-stone-200">
            <EmployeeList />
        </div>

      </div>
    </div>
  );
}