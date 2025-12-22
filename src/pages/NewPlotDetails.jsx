import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Image as ImageIcon, Save, Pencil, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NewPlotDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = React.useState(false);
  const [form, setForm] = React.useState({});

  const { data: row, isLoading } = useQuery({
    queryKey: ["newplot", id],
    enabled: !!id,
    queryFn: async () => {
      const list = await base44.entities.NewPlot.filter({ id });
      return list?.[0] || null;
    },
  });

  React.useEffect(() => {
    if (row) {
      setForm({
        section: row.section || "",
        row_number: row.row_number || "",
        plot_number: row.plot_number || "",
        status: row.status || "",
        first_name: row.first_name || "",
        last_name: row.last_name || "",
        family_name: row.family_name || "",
        birth_date: row.birth_date || "",
        death_date: row.death_date || "",
        notes: row.notes || "",
      });
    }
  }, [row]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.entities.NewPlot.update(id, form);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newplot", id] });
      setIsEditing(false);
    },
  });

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Missing plot id.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!row) {
    return (
      <div className="p-6">
        <Link to={createPageUrl("NewPlotsAndMap")}>← Back</Link>
        <p className="mt-4 text-gray-600">Plot not found.</p>
      </div>
    );
  }

  const InfoRow = ({ label, value }) => (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-gray-900 font-medium">{value || "-"}</div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("NewPlotsAndMap")} className="text-teal-700 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 ml-3">Plot Details</h1>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => { setIsEditing(false); setForm({ ...form, ...row }); }} className="gap-2 text-gray-600">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button onClick={() => updateMutation.mutate()} className="bg-teal-700 hover:bg-teal-800 gap-2">
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <section className="bg-white rounded-lg border p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {isEditing ? (
              <>
                <div className="md:col-span-1">
                  <label className="text-xs text-gray-500">Section</label>
                  <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs text-gray-500">Row</label>
                  <Input value={form.row_number} onChange={(e) => setForm({ ...form, row_number: e.target.value })} />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs text-gray-500">Plot #</label>
                  <Input value={form.plot_number} onChange={(e) => setForm({ ...form, plot_number: e.target.value })} />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs text-gray-500">Status</label>
                  <Select value={form.status || ""} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Available","Reserved","Occupied","Veteran","Unavailable","Unknown","Default"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">First Name</label>
                  <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">Last Name</label>
                  <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">Family / Owner</label>
                  <Input value={form.family_name} onChange={(e) => setForm({ ...form, family_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Birth Date</label>
                  <Input value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} placeholder="MM/DD/YYYY or YYYY-MM-DD" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Death Date</label>
                  <Input value={form.death_date} onChange={(e) => setForm({ ...form, death_date: e.target.value })} placeholder="MM/DD/YYYY or YYYY-MM-DD" />
                </div>
                <div className="md:col-span-4">
                  <label className="text-xs text-gray-500">Notes</label>
                  <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Section" value={row.section} />
                <InfoRow label="Row" value={row.row_number} />
                <InfoRow label="Plot #" value={row.plot_number} />
                <InfoRow label="Status" value={row.status} />
                <InfoRow label="First Name" value={row.first_name} />
                <InfoRow label="Last Name" value={row.last_name} />
                <InfoRow label="Family / Owner" value={row.family_name} />
                <InfoRow label="Birth Date" value={row.birth_date} />
                <InfoRow label="Death Date" value={row.death_date} />
                <div className="md:col-span-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Notes</div>
                  <div className="text-gray-900 whitespace-pre-wrap">{row.notes || "-"}</div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Associated Media</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {/* No linked media yet - placeholder */}
            <div className="col-span-2 text-sm text-gray-500 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> No media linked to this plot.
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">System</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <InfoRow label="Matched Plot ID" value={row.matched_plot_id} />
            <InfoRow label="Action Taken" value={row.action_taken} />
            <InfoRow label="Error" value={row.error} />
          </div>
        </section>
      </main>
    </div>
  );
}