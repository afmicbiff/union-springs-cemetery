import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ResendAck() {
  const params = new URLSearchParams(window.location.search);
  const initialReservationId = params.get("reservationId") || "";
  const initialPlotNumber = params.get("plotNumber") || "1173";

  const [reservationId, setReservationId] = React.useState(initialReservationId);
  const [plotNumber, setPlotNumber] = React.useState(initialPlotNumber);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const send = async () => {
    setLoading(true);
    setResult(null);
    try {
      const payload = {};
      if (reservationId.trim()) payload.reservationId = reservationId.trim();
      if (!payload.reservationId && plotNumber.trim()) payload.plotNumber = plotNumber.trim();

      const { data } = await base44.functions.invoke("sendReservationAcknowledgment", payload);
      setResult({ ok: !!data?.success, data });
    } catch (e) {
      setResult({ ok: false, error: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (initialReservationId || initialPlotNumber) {
      send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("Admin") + "?tab=reservations"} className="text-teal-700 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <h1 className="text-lg font-semibold text-gray-900 ml-3">Resend Reservation Acknowledgment</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Reservation ID (optional)</label>
              <Input value={reservationId} onChange={(e) => setReservationId(e.target.value)} placeholder="resv_..." />
            </div>
            <div>
              <label className="text-xs text-gray-500">Plot Number (fallback)</label>
              <Input value={plotNumber} onChange={(e) => setPlotNumber(e.target.value)} placeholder="e.g. 1173" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button onClick={send} disabled={loading} className="bg-teal-700 hover:bg-teal-800 text-white">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Resend Email
            </Button>
          </div>

          {result && (
            <div className={`mt-2 rounded-md border p-3 ${result.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2 text-sm">
                {result.ok ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-green-800">Email queued successfully.</span></>
                ) : (
                  <><AlertCircle className="w-4 h-4 text-red-600" /><span className="text-red-800">Failed to send.</span></>
                )}
              </div>
              <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(result.data || result.error, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          Tip: You can open this page with URL params to auto-send, e.g. {window.location.origin}/resendack?plotNumber=1173
        </div>
      </main>
    </div>
  );
}