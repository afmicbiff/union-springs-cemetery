import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import SignaturePad from '../components/common/SignaturePad';
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ReservePlot() {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState(1);
  const [selected, setSelected] = React.useState(null);
  const [prefill, setPrefill] = React.useState(null);
  const [signed, setSigned] = React.useState(false);
  const [sigFileUri, setSigFileUri] = React.useState(null);
  const [filters, setFilters] = React.useState({ search: '', section: 'All' });
  const [form, setForm] = React.useState({
    request_for: 'self',
    family_member_name: '',
    requester_name: '',
    requester_phone: '',
    requester_phone_secondary: '',
    donation_amount: '',
    notes: ''
  });
  const [acks, setAcks] = React.useState({
    rights: false, rightsDate: '',
    rules: false, rulesDate: '',
    fees: false, feesDate: '',
    contract: false, contractDate: ''
  });
  const [ackErrors, setAckErrors] = React.useState({});

  React.useEffect(() => {
    (async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return;
      }
    })();
  }, []);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const member = useQuery({
    queryKey: ['memberByEmail', user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const list = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
      return list?.[0] || null;
    },
    initialData: null
  });

  const plots = useQuery({
    queryKey: ['available-plots'],
    queryFn: async () => base44.entities.NewPlot.filter({ status: 'Available' }, 'plot_number', 500),
    initialData: []
  });

  React.useEffect(() => {
    try {
      const detailsRaw = localStorage.getItem('selected_plot_details');
      if (detailsRaw && !prefill) setPrefill(JSON.parse(detailsRaw));
      const id = localStorage.getItem('selected_plot_id');
      if (id && plots.data?.length) {
        const match = plots.data.find(p => p.id === id);
        if (match) setSelected(match);
      }
    } catch (_) {}
  }, [plots.data]);

  React.useEffect(() => {
    if (step !== 1 || !selected?.id) return;
    const el = document.querySelector(`[data-plot-id="${selected.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2','ring-teal-600','bg-teal-50');
      setTimeout(() => el.classList.remove('bg-teal-50'), 1500);
    }
  }, [step, selected]);

  React.useEffect(() => {
    if (user && !form.requester_name) {
      setForm((p) => ({ ...p, requester_name: user.full_name || '' }));
    }
  }, [user]);

  const createReservation = useMutation({
    mutationFn: async (payload) => base44.entities.NewPlotReservation.create(payload),
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations', user?.email] });
      if (created?.id) {
        await base44.functions.invoke('notifyReservationEvent', { event: 'submission', reservationId: created.id });
      }
      setStep(3);
    }
  });

  const filtered = (plots.data || []).filter((r) => {
    const q = filters.search.trim().toLowerCase();
    const matchQ = !q || [r.plot_number, r.first_name, r.last_name, r.family_name, r.row_number, r.section].some(v => String(v || '').toLowerCase().includes(q));
    const sectionOk = filters.section === 'All' || String(r.section || '').replace(/Section\s*/i,'').trim() === filters.section.replace(/Section\s*/i,'').trim();
    return matchQ && sectionOk;
  });

  const sections = React.useMemo(() => {
    const s = new Set();
    (plots.data || []).forEach(p => { const v = String(p.section || '').replace(/Section\s*/i,'').trim(); if (v) s.add(v); });
    return ['All', ...Array.from(s).sort((a,b)=>a.localeCompare(b))];
  }, [plots.data]);

  const uploadSignature = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    const file = new File([blob], 'signature.png', { type: 'image/png' });
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    setSigFileUri(file_uri);
    return file_uri;
  };

  const handleSubmit = async () => {
    const required = [selected?.id, form.requester_name, user?.email, form.requester_phone];
    const ackMissing = {
      rights: !acks.rights,
      rightsDate: !acks.rightsDate,
      rules: !acks.rules,
      rulesDate: !acks.rulesDate,
      fees: !acks.fees,
      feesDate: !acks.feesDate,
      contract: !acks.contract,
      contractDate: !acks.contractDate,
    };
    if (required.some(v => !String(v || '').trim()) || Object.values(ackMissing).some(Boolean)) {
      setAckErrors(ackMissing);
      alert('Please complete all required fields, acknowledgements, and dates.');
      return;
    }
    let doc = null;
    if (signed) {
      doc = await uploadSignature();
    }
    await createReservation.mutateAsync({
      new_plot_id: selected.id,
      request_for: form.request_for,
      family_member_name: form.request_for === 'family_member' ? form.family_member_name : '',
      requester_name: form.requester_name,
      requester_email: user.email,
      requester_phone: form.requester_phone,
      requester_phone_secondary: form.requester_phone_secondary,
      donation_amount: form.donation_amount ? Number(form.donation_amount) : undefined,
      notes: form.notes || '',
      requested_date: new Date().toISOString().slice(0,10),
      status: 'Pending Review',
      payment_status: 'Pending',
      ack_rights: acks.rights,
      ack_rights_date: acks.rightsDate,
      ack_rules: acks.rules,
      ack_rules_date: acks.rulesDate,
      ack_fees: acks.fees,
      ack_fees_date: acks.feesDate,
      ack_contract: acks.contract,
      ack_contract_date: acks.contractDate,
      signed_documents: doc ? [{ id: crypto.randomUUID(), name: 'Signature', file_uri: doc, uploaded_at: new Date().toISOString() }] : []
    });
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Reserve a Plot</CardTitle>
            <CardDescription>Guided application: select a plot, complete paperwork, and submit. Payment/signature provider setup pending.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4 text-sm">
              <span className={`px-2 py-1 rounded ${step===1? 'bg-teal-600 text-white':'bg-gray-100'}`}>1. Select Plot</span>
              <span className="text-gray-400">→</span>
              <span className={`px-2 py-1 rounded ${step===2? 'bg-teal-600 text-white':'bg-gray-100'}`}>2. Paperwork & Signature</span>
              <span className="text-gray-400">→</span>
              <span className={`px-2 py-1 rounded ${step===3? 'bg-teal-600 text-white':'bg-gray-100'}`}>3. Submitted</span>
            </div>

            {/* Require Member profile on file */}
            {(!member.isLoading && !member.data) ? (
              <div className="space-y-3">
                <div className="p-4 border rounded bg-amber-50 text-amber-900">
                  Please complete your Member Profile before requesting a reservation so we have your contact details.
                </div>
                <div className="flex justify-end">
                  <a href={createPageUrl('MemberPortal')} className="underline text-teal-700">Go to Member Portal/Account</a>
                </div>
              </div>
            ) : step === 1 && (
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
                {(prefill || selected) && (
                  <div className="rounded-md border border-teal-200 bg-teal-50 p-3 flex items-center justify-between">
                    <div className="text-sm text-teal-900">
                      Suggested from your selection:
                      <span className="ml-2 font-semibold">Section {prefill?.section || selected?.section || '-'}</span>
                      • Row <span className="font-semibold">{prefill?.row_number || selected?.row_number || '-'}</span>
                      • Plot <span className="font-semibold text-teal-700">{prefill?.plot_number || selected?.plot_number || '-'}</span>
                    </div>
                    <div className="text-xl font-bold text-teal-800">Plot {prefill?.plot_number || selected?.plot_number || '-'}</div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-auto">
                  {(filtered || []).map((r)=> (
                    <button key={r.id} data-plot-id={r.id} onClick={()=>setSelected(r)} className={`text-left border rounded p-2 hover:bg-gray-50 ${selected?.id===r.id ? 'ring-2 ring-teal-600 bg-teal-50' : ''}`}>
                      <div className="text-sm font-medium">Section {r.section || '-'} • Row {r.row_number || '-'} • Plot {r.plot_number || '-'}</div>
                      <div className="text-xs text-gray-600">{[r.first_name, r.last_name].filter(Boolean).join(' ') || r.family_name || 'Unnamed'}</div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button onClick={()=>setStep(2)} disabled={!selected} className="gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="p-3 rounded border border-teal-200 bg-teal-50 text-sm">Selected: Section {selected?.section || '-'} • Row {selected?.row_number || '-'} • Plot <span className="font-semibold text-teal-800">{selected?.plot_number || '-'}</span><span className="ml-2 text-xs text-gray-500">A certificate PDF will be generated after confirmation.</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Reservation For</label>
                    <Select value={form.request_for} onValueChange={(v)=>setForm({...form, request_for: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Self</SelectItem>
                        <SelectItem value="family_member">Family Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.request_for === 'family_member' && (
                    <div>
                      <label className="text-xs text-gray-600">Family Member Name</label>
                      <Input value={form.family_member_name} onChange={(e)=>setForm({...form, family_member_name: e.target.value})} />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-600">Your Full Name</label>
                    <Input value={form.requester_name} onChange={(e)=>setForm({...form, requester_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Email</label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Phone</label>
                    <Input value={form.requester_phone} onChange={(e)=>setForm({...form, requester_phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Phone (Secondary)</label>
                    <Input value={form.requester_phone_secondary} onChange={(e)=>setForm({...form, requester_phone_secondary: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Donation / Plot Fee (USD)</label>
                    <Input type="number" value={form.donation_amount} onChange={(e)=>setForm({...form, donation_amount: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-600">Notes</label>
                    <Textarea value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})} />
                  </div>
                </div>

                {/* Documents Acknowledgements */}
                <div className="space-y-6 mt-2">
                  {/* Certificate of Interment Rights (Contract) */}
                  <div className={`border rounded p-3 ${ackErrors.contract || ackErrors.contractDate ? 'border-red-500' : 'border-gray-200'}`}>
                    <div className="font-medium mb-2">Certificate of Interment Rights (Contract)</div>
                    <div className="max-h-40 overflow-auto text-sm text-gray-700 space-y-2">
                      <p><strong>Union Springs Cemetery</strong> • [City], Louisiana</p>
                      <p>THIS CERTIFIES THAT [Name of Owner] has been granted the perpetual use and exclusive Right of Interment in the grounds of [Name of Cemetery], subject to the rules and regulations of the Cemetery Authority and the laws of the State of Louisiana.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-sm">
                        <div>SECTION: <span className="font-mono">{selected?.section || '_____'} </span></div>
                        <div>Row: <span className="font-mono">{selected?.row_number || '_____'} </span></div>
                        <div>PLOT: <span className="font-mono">{selected?.plot_number || '_____'} </span></div>
                        <div>PLOT/GRAVE NUMBER: <span className="font-mono">{selected?.plot_number || '_____'} </span></div>
                      </div>
                      <p className="italic">“Blessed are those who mourn, for they will be comforted.” — Matthew 5:4</p>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                      <label className="text-sm flex items-center gap-2">
                        <input type="checkbox" checked={acks.contract} onChange={(e)=>{ setAcks({...acks, contract: e.target.checked}); if (ackErrors.contract) setAckErrors(prev=>({...prev, contract: false})); }} />
                        I have read and understand this certificate.
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Signature date</span>
                        <Input type="date" value={acks.contractDate} onChange={(e)=>{ setAcks({...acks, contractDate: e.target.value}); if (ackErrors.contractDate) setAckErrors(prev=>({...prev, contractDate: false})); }} className={ackErrors.contractDate ? 'border-red-500' : ''} />
                      </div>
                    </div>
                  </div>
                  {/* Rights Document */}
                  <div className={`border rounded p-3 ${ackErrors.rights || ackErrors.rightsDate ? 'border-red-500' : 'border-gray-200'}`}>
                    <div className="font-medium mb-2">Rights for purchaser and rights Union Springs Cemetery</div>
                    <div className="max-h-40 overflow-auto text-sm text-gray-700 space-y-2">
                      <p>The Louisiana Cemetery Act (Title 8) governs these rights.</p>
                      <p className="font-semibold">1. Rights of the Purchaser (Grantee)</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Right of Interment (exclusive use of the designated space).</li>
                        <li>Right of Succession/Descent to heirs if not otherwise willed.</li>
                        <li>Right to Memorialize, subject to cemetery rules.</li>
                        <li>Right of Access during open hours and in accordance with rules.</li>
                        <li>Right to Care as promised (e.g., maintenance; if perpetual care, via trust).</li>
                      </ul>
                      <p className="font-semibold">2. Rights of the Cemetery (Grantor)</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Right to Regulate (markers, decorations, hours, conduct) under La. R.S. 8:308.</li>
                        <li>Right to Collect Fees (opening/closing, monument setting, transfers).</li>
                        <li>Right to Rectify Errors in good faith.</li>
                        <li>Right to Reclaim Abandoned Plots per statute after diligent search.</li>
                        <li>Right of Refusal absent required permits or unpaid fees.</li>
                      </ul>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                      <label className="text-sm flex items-center gap-2">
                        <input type="checkbox" checked={acks.rights} onChange={(e)=>{ setAcks({...acks, rights: e.target.checked}); if (ackErrors.rights) setAckErrors(prev=>({...prev, rights: false})); }} />
                        I have read and understand this document.
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Signature date</span>
                        <Input type="date" value={acks.rightsDate} onChange={(e)=>{ setAcks({...acks, rightsDate: e.target.value}); if (ackErrors.rightsDate) setAckErrors(prev=>({...prev, rightsDate: false})); }} className={ackErrors.rightsDate ? 'border-red-500' : ''} />
                      </div>
                    </div>
                  </div>

                  {/* Rules & Regulations */}
                  <div className={`border rounded p-3 ${ackErrors.rules || ackErrors.rulesDate ? 'border-red-500' : 'border-gray-200'}`}>
                    <div className="font-medium mb-2">Rules and Regulations (Union Springs Cemetery)</div>
                    <div className="max-h-40 overflow-auto text-sm text-gray-700 space-y-2">
                      <p className="font-semibold">I. General Supervision</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Management may enforce rules and close grounds as needed.</li>
                        <li>Admission during posted hours; trespass after dark.</li>
                        <li>Prohibitions: boisterous/profane language, loitering, alcohol/drugs.</li>
                      </ul>
                      <p className="font-semibold">II. Interments and Funerals</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Advance notice required; Burial Transit Permit/cremation certificate required.</li>
                        <li>Approved vault/liner required; only designated personnel may open/close graves.</li>
                      </ul>
                      <p className="font-semibold">III. Decoration of Plots (Strictly Enforced)</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Flowers allowed; unsightly items removed at management discretion; scheduled cleanups.</li>
                        <li>Prohibited: glass/ceramics, solar lights, metal rods/hooks, loose stones/coping.</li>
                        <li>No planting without approval; obstructions may be removed.</li>
                      </ul>
                      <p className="font-semibold">IV. Memorials and Monuments</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Granite/marble/bronze only; foundation required; cemetery approves size/location.</li>
                        <li>No liability for vandalism or unavoidable damage.</li>
                      </ul>
                      <p className="font-semibold">V. Correction of Errors</p>
                      <p>The cemetery may correct errors by relocating remains to an equivalent plot.</p>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                      <label className="text-sm flex items-center gap-2">
                        <input type="checkbox" checked={acks.rules} onChange={(e)=>{ setAcks({...acks, rules: e.target.checked}); if (ackErrors.rules) setAckErrors(prev=>({...prev, rules: false})); }} />
                        I have read and understand these rules.
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Signature date</span>
                        <Input type="date" value={acks.rulesDate} onChange={(e)=>{ setAcks({...acks, rulesDate: e.target.value}); if (ackErrors.rulesDate) setAckErrors(prev=>({...prev, rulesDate: false})); }} className={ackErrors.rulesDate ? 'border-red-500' : ''} />
                      </div>
                    </div>
                  </div>

                  {/* Schedule of Fees */}
                  <div className={`border rounded p-3 ${ackErrors.fees || ackErrors.feesDate ? 'border-red-500' : 'border-gray-200'}`}>
                    <div className="font-medium mb-2">Schedule of Fees and Charges</div>
                    <div className="max-h-40 overflow-auto text-sm text-gray-700 space-y-2">
                      <p>Effective date: [Month, Day, Year]. All fees due prior to interment.</p>
                      <p className="font-semibold">I. Interment Rights (Purchase of Plot)</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Standard Adult Plot: $500.00</li>
                        <li>Cremation Plot / Infant Plot / Second Right of Interment: see current schedule.</li>
                        <li>Donation option ($400+) subject to Board approval.</li>
                      </ul>
                      <p className="font-semibold">II. Opening and Closing Services</p>
                      <p>Weekday/Weekend/Holiday surcharges may apply; late arrival hourly charges.</p>
                      <p className="font-semibold">III. Memorialization & Administrative Fees</p>
                      <p>Marker permit/inspection, deed transfer, duplicate deed per schedule.</p>
                      <p className="font-semibold">IV. Payment Policies</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Accepted forms: Cash, Cashier’s Check, Money Order; personal checks pre-need only.</li>
                        <li>No credit; all fees must be paid before burial.</li>
                        <li>Perpetual care deposits may apply.</li>
                      </ul>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                      <label className="text-sm flex items-center gap-2">
                        <input type="checkbox" checked={acks.fees} onChange={(e)=>{ setAcks({...acks, fees: e.target.checked}); if (ackErrors.fees) setAckErrors(prev=>({...prev, fees: false})); }} />
                        I have read and understand the fee schedule.
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Signature date</span>
                        <Input type="date" value={acks.feesDate} onChange={(e)=>{ setAcks({...acks, feesDate: e.target.value}); if (ackErrors.feesDate) setAckErrors(prev=>({...prev, feesDate: false})); }} className={ackErrors.feesDate ? 'border-red-500' : ''} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Signature</div>
                  <SignaturePad onChange={setSigned} />
                  <p className="text-xs text-gray-500 mt-1">By signing, you acknowledge the Cemetery Rules & Regulations and the conditions of reservation under Louisiana law.</p>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={()=>setStep(1)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
                  <Button onClick={handleSubmit} disabled={createReservation.isPending} className="gap-2">
                    {createReservation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Submit Application
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
                <div className="text-lg font-semibold">Application submitted</div>
                <div className="text-sm text-gray-600">We will review your request. You can track status in your Member Portal under Reservations.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}