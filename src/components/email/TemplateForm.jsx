import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function TemplateForm({ open, onOpenChange, initial, onSave }) {
  const [form, setForm] = React.useState(initial || {
    name: "",
    key: "",
    category: "general",
    description: "",
    subject: "",
    body: "",
    placeholders: []
  });

  React.useEffect(() => {
    setForm(initial || { name: "", key: "", category: "general", description: "", subject: "", body: "", placeholders: [] });
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Name</label>
              <Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="text-xs text-gray-500">Key (optional)</label>
              <Input value={form.key || ""} onChange={(e)=>setForm({...form, key: e.target.value})} placeholder="reservation_ack" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Category</label>
              <select className="w-full border rounded-md px-2 py-2 text-sm" value={form.category} onChange={(e)=>setForm({...form, category: e.target.value})}>
                <option value="general">General</option>
                <option value="reservation">Reservation</option>
                <option value="inquiry">Inquiry</option>
                <option value="invoice">Invoice</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Description</label>
              <Input value={form.description || ""} onChange={(e)=>setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Subject</label>
            <Input value={form.subject} onChange={(e)=>setForm({...form, subject: e.target.value})} required />
          </div>
          <div>
            <label className="text-xs text-gray-500">Body</label>
            <Textarea rows={10} value={form.body} onChange={(e)=>setForm({...form, body: e.target.value})} required />
            <div className="text-xs text-gray-500 mt-1">Use placeholders with {{variable}} syntax, e.g. {{requester_name}}.</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={()=>onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}