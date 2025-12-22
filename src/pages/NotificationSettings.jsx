import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield } from "lucide-react";

const DEFAULTS = {
  email_recipients: [],
  reservation_expirations: { enabled: true, email: true, in_app: true },
  new_reservation_requests: { enabled: true, email: true, in_app: true },
  plot_status_changes: { enabled: true, email: true, in_app: true },
};

function EventRow({ label, value, onChange, description }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
      <div>
        <div className="text-sm font-medium text-stone-800">{label}</div>
        {description ? <div className="text-xs text-stone-500">{description}</div> : null}
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <Switch checked={!!value.enabled} onCheckedChange={(v)=>onChange({ ...value, enabled: v })} />
          <span className="text-xs text-stone-600">Enabled</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!value.in_app} onCheckedChange={(v)=>onChange({ ...value, in_app: v })} />
          <span className="text-xs text-stone-600">In-app</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!value.email} onCheckedChange={(v)=>onChange({ ...value, email: v })} />
          <span className="text-xs text-stone-600">Email</span>
        </div>
      </div>
    </div>
  );
}

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me().catch(() => null) });
  const isAdmin = user?.role === "admin";

  const { data: settingsList, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => base44.entities.NotificationSettings.list(),
    initialData: [],
  });

  const existing = settingsList?.[0] || null;
  const [form, setForm] = React.useState(existing || DEFAULTS);

  React.useEffect(() => {
    if (existing) setForm({ ...DEFAULTS, ...existing });
  }, [existing?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        email_recipients: (form.email_recipients || []).filter(Boolean),
        reservation_expirations: form.reservation_expirations || DEFAULTS.reservation_expirations,
        new_reservation_requests: form.new_reservation_requests || DEFAULTS.new_reservation_requests,
        plot_status_changes: form.plot_status_changes || DEFAULTS.plot_status_changes,
      };
      if (existing?.id) return base44.entities.NotificationSettings.update(existing.id, payload);
      return base44.entities.NotificationSettings.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    }
  });

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl w-full mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" /> Restricted</CardTitle>
            <CardDescription>Only administrators can view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const recipientsText = (form.email_recipients || []).join(", ");

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-stone-900">Notification Settings</h1>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-teal-700 hover:bg-teal-800 text-white">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Events & Delivery</CardTitle>
            <CardDescription>Choose which events generate notifications and how they are delivered.</CardDescription>
          </CardHeader>
          <CardContent>
            <EventRow
              label="Reservation Expirations"
              description="When a temporary hold is about to expire or has expired."
              value={form.reservation_expirations || DEFAULTS.reservation_expirations}
              onChange={(v)=>setForm((f)=>({ ...f, reservation_expirations: v }))}
            />
            <Separator className="my-1" />
            <EventRow
              label="New Reservation Requests"
              description="When a public user submits a new reservation request."
              value={form.new_reservation_requests || DEFAULTS.new_reservation_requests}
              onChange={(v)=>setForm((f)=>({ ...f, new_reservation_requests: v }))}
            />
            <Separator className="my-1" />
            <EventRow
              label="Plot Status Changes"
              description="When a plot changes status (e.g., Available → Reserved)."
              value={form.plot_status_changes || DEFAULTS.plot_status_changes}
              onChange={(v)=>setForm((f)=>({ ...f, plot_status_changes: v }))}
            />

            <div className="mt-6">
              <div className="text-sm font-medium text-stone-800 mb-1">Email recipients</div>
              <div className="text-xs text-stone-500 mb-2">Comma-separated emails. If empty, the system may notify all admins.</div>
              <Input
                value={recipientsText}
                onChange={(e)=> setForm((f)=> ({
                  ...f,
                  email_recipients: e.target.value
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
                }))}
                placeholder="admin1@example.com, admin2@example.com"
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}