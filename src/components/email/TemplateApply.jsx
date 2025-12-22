import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ChevronDown } from "lucide-react";

function extractVars(text) {
  const set = new Set();
  const re = /\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(text || "")) !== null) set.add(m[1]);
  return Array.from(set);
}

function renderTemplate(tpl, vars) {
  return (tpl || "").replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, k) => (vars?.[k] ?? ""));
}

export default function TemplateApply({ onApply }) {
  const { data: templates = [] } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => base44.entities.EmailTemplate.list("name", 200)
  });

  const [selected, setSelected] = React.useState(null);
  const [vars, setVars] = React.useState({});

  const current = templates.find(t => t.id === selected) || null;
  const varKeys = React.useMemo(() => {
    if (!current) return [];
    const fromSchema = Array.isArray(current.placeholders) ? current.placeholders : [];
    const fromText = Array.from(new Set([...extractVars(current.subject), ...extractVars(current.body)]));
    return Array.from(new Set([...(fromSchema||[]), ...fromText]));
  }, [current]);

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-teal-700" />
        <h3 className="font-semibold">Use a template</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="text-xs text-gray-500">Template</label>
          <Select value={selected || ""} onValueChange={(v)=>setSelected(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {current && varKeys.length > 0 && (
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {varKeys.map(k => (
              <div key={k}>
                <label className="text-xs text-gray-500">{k}</label>
                <Input value={vars[k] || ""} onChange={(e)=>setVars({...vars, [k]: e.target.value})} />
              </div>
            ))}
          </div>
        )}
      </div>
      {current && (
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={() => onApply(
            renderTemplate(current.subject, vars),
            renderTemplate(current.body, vars)
          )} className="bg-teal-700 hover:bg-teal-800 text-white">
            Apply to compose
          </Button>
        </div>
      )}
    </Card>
  );
}