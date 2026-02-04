import React, { useState, useCallback, memo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const ContactForm = memo(function ContactForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
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

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const data = { ...form };
    data.interests = form.interests
      ? form.interests.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    onSave?.(data);
  }, [form, onSave]);

  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div>
          <Label className="text-xs">First Name</Label>
          <Input value={form.first_name} onChange={(e) => handleChange('first_name', e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Last Name</Label>
          <Input value={form.last_name} onChange={(e) => handleChange('last_name', e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input type="email" value={form.email_primary} onChange={(e) => handleChange('email_primary', e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input value={form.phone_primary} onChange={(e) => handleChange('phone_primary', e.target.value)} className="h-9" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Address</Label>
          <Input value={form.address} onChange={(e) => handleChange('address', e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">City</Label>
          <Input value={form.city} onChange={(e) => handleChange('city', e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">State / ZIP</Label>
          <div className="flex gap-2">
            <Input value={form.state} onChange={(e) => handleChange('state', e.target.value)} className="h-9 w-20" placeholder="ST" />
            <Input value={form.zip} onChange={(e) => handleChange('zip', e.target.value)} className="h-9 flex-1" placeholder="ZIP" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Interests</Label>
          <Input value={form.interests} onChange={(e) => handleChange('interests', e.target.value)} placeholder="events, donations" className="h-9" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Notes</Label>
          <Textarea rows={2} value={form.comments} onChange={(e) => handleChange('comments', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white">Save</Button>
      </div>
    </form>
  );
});

export default ContactForm;