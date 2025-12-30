import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Info, RefreshCw, ShieldAlert } from "lucide-react";
import { runAllChecks } from "./checks";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SevDot = ({ sev }) => {
  const map = {
    critical: "bg-red-700",
    high: "bg-red-600",
    medium: "bg-amber-500",
    low: "bg-yellow-400",
    pass: "bg-emerald-500",
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[sev] || 'bg-gray-400'}`} />;
};

export default function QualityAdvisor() {
  const [items, setItems] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [ack, setAck] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const rerun = React.useCallback(() => {
    setItems(runAllChecks());
  }, []);

  React.useEffect(() => {
    rerun();
    const t = setTimeout(rerun, 500); // after initial paint
    return () => clearTimeout(t);
  }, [rerun]);

  const publish = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.AuditLog.create({
        action: "publish",
        entity_type: "site",
        details: `Developer acknowledged ${items.filter(i=>i.severity!=='pass').length} warnings` ,
        metadata: { warnings: items },
        performed_by: user?.email || "unknown",
        timestamp: new Date().toISOString(),
      });
      toast.success("Publish logged with advisory warnings");
      setOpen(false);
      setAck(false);
    } catch (e) {
      toast.error("Failed to log publish");
    } finally {
      setLoading(false);
    }
  };

  const counts = items.reduce((acc, it) => { acc[it.severity] = (acc[it.severity]||0)+1; return acc; }, {});

  return (
    <Card className="bg-white border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><ShieldAlert className="w-4 h-4"/>Quality Advisor</CardTitle>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1"><SevDot sev="critical"/> {counts.critical||0}</span>
          <span className="flex items-center gap-1"><SevDot sev="high"/> {counts.high||0}</span>
          <span className="flex items-center gap-1"><SevDot sev="medium"/> {counts.medium||0}</span>
          <span className="flex items-center gap-1"><SevDot sev="low"/> {counts.low||0}</span>
          <span className="flex items-center gap-1"><SevDot sev="pass"/> {counts.pass||0}</span>
          <Button variant="outline" size="sm" onClick={rerun} className="ml-2 gap-1"><RefreshCw className="w-3 h-3"/>Re-run</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500 border-b">
                <th className="py-2">Severity</th>
                <th>Category</th>
                <th>Page/Component</th>
                <th>Explanation</th>
                <th>Recommended fix</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2">
                    <span className="inline-flex items-center gap-2">
                      <SevDot sev={it.severity} />
                      <span className={it.severity==='high'||it.severity==='critical' ? 'text-red-700' : it.severity==='medium' ? 'text-amber-600' : it.severity==='low' ? 'text-yellow-700' : 'text-emerald-700'}>
                        {it.severity.toUpperCase()}
                      </span>
                    </span>
                  </td>
                  <td>{it.category}</td>
                  <td>{it.target}</td>
                  <td className="max-w-[420px] pr-3">{it.message}</td>
                  <td className="max-w-[420px] pr-3">{it.fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setOpen(true)} className="bg-teal-700 hover:bg-teal-800">
            Acknowledge & Publish
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Publish with warnings</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5"/>
                <p>You are about to publish with {items.filter(i=>i.severity!=='pass').length} warnings. Publishing will not be blocked. An audit record will be created.</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ack} onChange={(e)=>setAck(e.target.checked)} />
                I acknowledge the current advisory warnings.
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button disabled={!ack || loading} onClick={publish} className="bg-teal-700 hover:bg-teal-800">{loading? 'Publishing…' : 'Confirm & Publish'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}