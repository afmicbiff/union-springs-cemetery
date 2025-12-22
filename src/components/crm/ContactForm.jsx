import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ContactForm({ initial, onSave, onCancel }) {
  const [form, setForm] = React.useState(() => ({
    first_name: initial?.first_name || "",
    last_name: initial?.last_name || "",
    email_primary: initial?.email_primary || "",
    phone_primary: initial?.phone_primary || "",
    address: initial?.address || "",
    city: initial?.city || "",
    state: initial?.state || "",
    zip: initial?.zip || "",
    interests: Array.isArray(initial?.interests) ? initial.interests.join(", ") : "",
    comments: initial?.comments || "",
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    data.interests = form.interests
      ? form.interests.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    onSave?.(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">First Name</Label>
          <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Last Name</Label>
          <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input type="email" value={form.email_primary} onChange={(e) => setForm({ ...form, email_primary: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input value={form.phone_primary} onChange={(e) => setForm({ ...form, phone_primary: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Address</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">City</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">State</Label>
          <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">ZIP</Label>
          <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Interests (comma separated)</Label>
          <Input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="events, donations, upkeep" />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Notes</Label>
          <Textarea rows={3} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white">Save</Button>
      </div>
    </form>
  );
}