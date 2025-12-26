import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight, CreditCard, AlertCircle, MapPin } from "lucide-react";

export default function ReservationWizard() {
  const qc = useQueryClient();
  const [step, setStep] = React.useState(1);
  const [selected, setSelected] = React.useState(null);
  const [filters, setFilters] = React.useState({ search: "", section: "All" });
  const [form, setForm] = React.useState({ donation_amount: "" });
  const [acks, setAcks] = React.useState({ terms: false, rules: false, fees: false });
  const [error, setError] = React.useState("");

  // Current user and member profile
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const memberQ = useQuery({
    queryKey: ["memberByEmail", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const list = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
      return list?.[0] || null;
    },
    initialData: null,
  });

  // Available plots
  const plots = useQuery({
    queryKey: ["available-new-plots"],
    queryFn: async () => base44.entities.NewPlot.filter({ status: "Available" }, "plot_number", 1000),
    initialData: [],
  });

  // Prefill from RequestPlotDialog selection if present
  React.useEffect(() => {
    try {
      const id = localStorage.getItem("selected_plot_id");
      if (id && plots.data?.length) {
        const match = plots.data.find((p) => p.id === id);
        if (match) setSelected(match);
      }
    } catch (_) {}
  }, [plots.data]);

  const sections = React.useMemo(() => {
    const s = new Set();
    (plots.data || []).forEach((p) => {
      const v = String(p.section || "").replace(/Section\s*/i, "").trim();
      if (v) s.add(v);
    });
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [plots.data]);

  const filtered = (plots.data || []).filter((r) => {
    const q = filters.search.trim().toLowerCase();
    const qOk = !q || [r.plot_number, r.first_name, r.last_name, r.family_name, r.row_number, r.section]
      .some((v) => String(v || "").toLowerCase().includes(q));
    const sOk = filters.section === "All" || String(r.section || "").replace(/Section\s*/i, "").trim() === filters.section;
    return qOk && sOk;
  });

  const createReservation = useMutation({
    mutationFn: async () => {
      const payload = {
        new_plot_id: selected.id,
        requester_name: user?.full_name || "",
        requester_email: user?.email || "",
        donation_amount: form.donation_amount ? Number(form.donation_amount) : undefined,
        status: "Pending Review",
        payment_status: "Pending",
        requested_date: new Date().toISOString().slice(0, 10),
        notes: "Submitted via Member Portal/Account wizard",
        ack_rights: acks.terms,
        ack_rules: acks.rules,
        ack_fees: acks.fees,
      };
      const created = await base44.entities.NewPlotReservation.create(payload);
      // Fire notification email to admins + requester
      if (created?.id) {
        await base44.functions.invoke("notifyReservationEvent", { event: "submission", reservationId: created.id });
      }
      // Create invoice when member profile exists
      if (memberQ.data && form.donation_amount) {
        const inv = {
          invoice_number: `INV-${Date.now()}`,
          member_id: memberQ.data.id,
          member_email: user.email,
          reservation_id: created?.id,
          title: `Plot Reservation — Section ${selected.section || "-"}, Row ${selected.row_number || "-"}, Plot ${selected.plot_number || "-"}`,
          description: "Reservation fees",
          amount: Number(form.donation_amount),
          status: "Pending",
          due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        };
        await base44.entities.Invoice.create(inv);
      }
      return created;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["my-reservations", user?.email] });
      await qc.invalidateQueries({ queryKey: ["invoices", user?.email] });
      setStep(3);
    },
    onError: (e) => setError(e?.message || "Failed to submit reservation. Please try again."),
  });

  const next = () => {
    setError("");
    if (step === 1) {
      if (!selected) { setError("Please select a plot to continue."); return; }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!acks.terms || !acks.rules || !acks.fees) { setError("Please accept all terms to continue."); return; }
      setStep(3);
      return;
    }
  };

  const back = () => { setError(""); setStep((s) => Math.max(1, s - 1)); };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reserve a Plot (Wizard)</CardTitle>
        <CardDescription>Follow the steps to request a plot and start payment.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className={`px-2 py-1 rounded ${step===1? 'bg-teal-600 text-white':'bg-gray-100'}`}>1. Select Plot</span>
          <span className="text-gray-400">→</span>
          <span className={`px-2 py-1 rounded ${step===2? 'bg-teal-600 text-white':'bg-gray-100'}`}>2. Terms</span>
          <span className="text-gray-400">→</span>
          <span className={`px-2 py-1 rounded ${step===3? 'bg-teal-600 text-white':'bg-gray-100'}`}>3. Payment</span>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input placeholder="Search by plot, name, row…" value={filters.search} onChange={(e)=>setFilters({...filters, search: e.target.value})} />
              <Select value={filters.section} onValueChange={(v)=>setFilters({...filters, section: v})}>
                <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  {sections.map((s)=> (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={()=>plots.refetch()}>Refresh</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-auto">
              {(filtered || []).map((r)=> (
                <button key={r.id} onClick={()=>setSelected(r)} className={`text-left border rounded p-2 hover:bg-gray-50 ${selected?.id===r.id ? 'ring-2 ring-teal-600' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Section {r.section || '-'} • Row {r.row_number || '-'} • Plot {r.plot_number || '-'}</div>
                    <Badge variant="outline" className="text-[10px]">{r.status || 'Unknown'}</Badge>
                  </div>
                  <div className="text-xs text-gray-600 truncate mt-0.5">{[r.first_name, r.last_name].filter(Boolean).join(' ') || r.family_name || 'Unnamed'}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button onClick={next} className="gap-2">Continue <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3 rounded bg-gray-50 text-sm">
              Selected: Section {selected?.section || '-'} • Row {selected?.row_number || '-'} • Plot {selected?.plot_number || '-'}
            </div>
            <div className="space-y-3">
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={acks.terms} onChange={(e)=>setAcks({...acks, terms: e.target.checked})} />
                I have read and accept the Terms & Conditions.
              </label>
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={acks.rules} onChange={(e)=>setAcks({...acks, rules: e.target.checked})} />
                I have read and accept the Rules & Regulations.
              </label>
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={acks.fees} onChange={(e)=>setAcks({...acks, fees: e.target.checked})} />
                I agree to the Schedule of Fees.
              </label>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={back} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
              <Button onClick={next} className="gap-2">Continue <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3 rounded bg-gray-50 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <div>
                <div className="font-medium">Review & Payment</div>
                <div className="text-xs text-gray-600">Section {selected?.section || '-'} • Row {selected?.row_number || '-'} • Plot {selected?.plot_number || '-'}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Donation / Plot Fee (USD)</label>
                <Input type="number" value={form.donation_amount} onChange={(e)=>setForm({...form, donation_amount: e.target.value})} placeholder="e.g., 500" />
                <p className="text-[11px] text-gray-500 mt-1">Used to create your invoice. You can leave blank if undecided.</p>
              </div>
              <div>
                <label className="text-xs text-gray-600">Your Email</label>
                <Input value={user?.email || ''} disabled />
              </div>
            </div>
            {!memberQ.data && (
              <div className="p-3 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-sm">
                Please complete your Member Profile in the Profile tab to enable invoicing and payment.
              </div>
            )}
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={back} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
              <Button onClick={() => createReservation.mutate()} disabled={createReservation.isPending} className="gap-2">
                {createReservation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Submit & Create Invoice
              </Button>
            </div>
            {createReservation.isSuccess && (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Reservation submitted. You can review it below and pay from the Invoices tab.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}