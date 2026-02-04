import React, { useState, useEffect, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const DEFAULT_FORM = {
  name: "",
  key: "",
  category: "general",
  description: "",
  subject: "",
  body: "",
  placeholders: []
};

function TemplateForm({ open, onOpenChange, initial, onSave }) {
  const [form, setForm] = useState(initial || DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(initial || DEFAULT_FORM);
    setIsSubmitting(false);
  }, [initial, open]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (isSubmitting || !form.name?.trim() || !form.subject?.trim() || !form.body?.trim()) return;
    setIsSubmitting(true);
    onSave({
      ...form,
      name: form.name.trim(),
      subject: form.subject.trim(),
      body: form.body.trim()
    });
  }, [form, onSave, isSubmitting]);

  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{initial ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs text-gray-500">Name *</label>
              <Input 
                value={form.name} 
                onChange={(e) => updateField('name', e.target.value)} 
                required 
                maxLength={100}
                className="h-8 sm:h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs text-gray-500">Key (optional)</label>
              <Input 
                value={form.key || ""} 
                onChange={(e) => updateField('key', e.target.value)} 
                placeholder="reservation_ack" 
                maxLength={50}
                className="h-8 sm:h-9 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs text-gray-500">Category</label>
              <select 
                className="w-full border rounded-md px-2 py-1.5 sm:py-2 text-sm h-8 sm:h-9" 
                value={form.category} 
                onChange={(e) => updateField('category', e.target.value)}
              >
                <option value="general">General</option>
                <option value="reservation">Reservation</option>
                <option value="inquiry">Inquiry</option>
                <option value="invoice">Invoice</option>
                <option value="member">Member</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs text-gray-500">Description</label>
              <Input 
                value={form.description || ""} 
                onChange={(e) => updateField('description', e.target.value)} 
                maxLength={200}
                className="h-8 sm:h-9 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] sm:text-xs text-gray-500">Subject *</label>
            <Input 
              value={form.subject} 
              onChange={(e) => updateField('subject', e.target.value)} 
              required 
              maxLength={200}
              className="h-8 sm:h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] sm:text-xs text-gray-500">Body *</label>
            <Textarea 
              rows={8} 
              value={form.body} 
              onChange={(e) => updateField('body', e.target.value)} 
              required 
              maxLength={5000}
              className="text-sm"
            />
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
              Use placeholders: {'{{'}variable{'}}'}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-8 text-xs sm:text-sm">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-teal-700 hover:bg-teal-800 text-white h-8 text-xs sm:text-sm" 
              disabled={isSubmitting || !form.name?.trim() || !form.subject?.trim() || !form.body?.trim()}
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(TemplateForm);