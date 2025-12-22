import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, Send } from "lucide-react";

export default function SendEmail() {
  const [form, setForm] = React.useState({ to: "", subject: "", body: "", from_name: "" });
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }
      if (user.role !== "admin") {
        window.location.href = "/";
        return;
      }
      setIsAuthorized(true);
    };
    checkAuth();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!form.to || !form.subject || !form.body) {
      setResult({ ok: false, message: "Please fill To, Subject, and Body." });
      return;
    }
    setSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: form.to,
        subject: form.subject,
        body: form.body,
        from_name: form.from_name || undefined,
      });
      setResult({ ok: true, message: "Email sent successfully." });
      setForm({ to: "", subject: "", body: "", from_name: "" });
    } finally {
      setSending(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-stone-600">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <header className="bg-white border-b px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Mail className="w-5 h-5 text-teal-700" />
          <h1 className="text-xl font-semibold text-gray-900">Send Email</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-4">
            Use Base44’s built-in email service to send messages to any external address.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500">To</label>
              <Input
                type="email"
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                placeholder="recipient@example.com"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Subject</label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Subject"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">From Name (optional)</label>
                <Input
                  value={form.from_name}
                  onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                  placeholder="Union Springs"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Body</label>
              <Textarea
                rows={8}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder={"Write your message here..."}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={sending} className="bg-teal-700 hover:bg-teal-800 text-white gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending..." : "Send Email"}
              </Button>
            </div>

            {result && (
              <div className={`text-sm mt-2 ${result.ok ? "text-green-700" : "text-red-700"}`}>
                {result.message}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}