import React, { useState, useMemo, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Loader2 } from "lucide-react";

function extractVars(text) {
  const set = new Set();
  const re = /\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(text || "")) !== null) set.add(m[1]);
  return Array.from(set);
}

function renderTemplate(tpl, vars) {
  let s = tpl || "";
  s = s.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\?\s*\}\}([\s\S]*?)\{\{\/\s*\1\?\s*\}\}/g, (_, k, inner) => (vars && vars[k] ? inner : ""));
  return s.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, k) => (vars?.[k] ?? ""));
}

function TemplateApply({ onApply }) {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => base44.entities.EmailTemplate.list("name", 200),
    staleTime: 5 * 60_000,
  });

  const [selected, setSelected] = useState(null);
  const [vars, setVars] = useState({});

  const current = useMemo(() => templates.find(t => t.id === selected) || null, [templates, selected]);
  
  const varKeys = useMemo(() => {
    if (!current) return [];
    const fromSchema = Array.isArray(current.placeholders) ? current.placeholders : [];
    const fromText = Array.from(new Set([...extractVars(current.subject), ...extractVars(current.body)]));
    return Array.from(new Set([...fromSchema, ...fromText]));
  }, [current]);

  const handleApply = useCallback(() => {
    if (!current) return;
    onApply(
      renderTemplate(current.subject, vars),
      renderTemplate(current.body, vars)
    );
  }, [current, vars, onApply]);

  const updateVar = useCallback((key, value) => {
    setVars(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <Card className="p-3 sm:p-4 mb-3 sm:mb-4">
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700" />
        <h3 className="font-semibold text-sm sm:text-base">Use a template</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 items-end">
        <div className="md:col-span-1">
          <label className="text-[10px] sm:text-xs text-gray-500">Template</label>
          <Select value={selected || ""} onValueChange={setSelected}>
            <SelectTrigger className="h-8 sm:h-9 text-sm">
              {isLoading ? (
                <span className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                </span>
              ) : (
                <SelectValue placeholder="Select a template" />
              )}
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id} className="text-sm">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {current && varKeys.length > 0 && (
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {varKeys.slice(0, 6).map(k => (
              <div key={k} className="space-y-0.5">
                <label className="text-[10px] sm:text-xs text-gray-500 truncate block">{k}</label>
                <Input 
                  value={vars[k] || ""} 
                  onChange={(e) => updateVar(k, e.target.value)} 
                  className="h-8 sm:h-9 text-sm"
                  maxLength={200}
                />
              </div>
            ))}
            {varKeys.length > 6 && (
              <div className="text-[10px] text-gray-400 col-span-full">+{varKeys.length - 6} more variables</div>
            )}
          </div>
        )}
      </div>
      {current && (
        <div className="mt-3 sm:mt-4">
          <Button onClick={handleApply} className="bg-teal-700 hover:bg-teal-800 text-white h-8 sm:h-9 text-xs sm:text-sm">
            Apply to compose
          </Button>
        </div>
      )}
    </Card>
  );
}

export default memo(TemplateApply);