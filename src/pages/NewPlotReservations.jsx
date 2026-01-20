import React from 'react';
import NewPlotsBrowser from "../components/plots/NewPlotsBrowser";
import NewPlotReservation1Map from "../components/plots/NewPlotReservation1Map";
import PlotReservationsAdmin from "@/components/admin/PlotReservationsAdmin";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from 'lucide-react';

export default function NewPlotReservations() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: member } = useQuery({
    queryKey: ['memberByEmail', user?.email],
    enabled: !!user?.email,
    queryFn: async () => (await base44.entities.Member.filter({ email_primary: user.email }, null, 1))?.[0] || null,
    initialData: null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const employeeQ = useQuery({
    queryKey: ['employeeByEmail', user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      if (!user?.email) return null;
      const result = await base44.entities.Employee.filter(
        {
          $or: [
            { email: user.email },
            { work_email: user.email }
          ]
        },
        null,
        1
      );
      return result?.[0] || null;
    },
    initialData: null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const employee = employeeQ.data;
  const isAdmin = user?.role === 'admin';
  const isMember = !!member;
  const isEmployee = !!employee;
  const isBoard = !!(employee && ((employee.title && /board/i.test(employee.title)) || (employee.role && /board/i.test(employee.role)) || employee.is_board_member));
  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <header className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Plot Reservations</h1>
              <span className="text-sm text-gray-500 hidden sm:inline">Administrative Overview & Management</span>
            </div>
            <div className="text-xs text-gray-600 flex flex-wrap items-center gap-2">
              <span>Signed in as:</span>
              {isAdmin && <Badge className="bg-teal-100 text-teal-800">Administrator</Badge>}
              {isEmployee && <Badge className="bg-indigo-100 text-indigo-800">Employee</Badge>}
              {isBoard && <Badge className="bg-purple-100 text-purple-800">Board Member</Badge>}
              {isMember && <Badge variant="outline">Member</Badge>}
            </div>
          </div>
          <Link to={createPageUrl('Admin')}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Admin
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {isAdmin && (
          <div className="mb-8">
            <PlotReservationsAdmin />
          </div>
        )}
        
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">New Plots Map</h2>
          <NewPlotReservation1Map />
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Import Batches & Data</h2>
          <NewPlotsBrowser />
        </div>
      </main>
    </div>
  );
}