import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Save } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SegmentBuilder({ criteria, onChange, onSave, savedSegments, onLoadSegment }) {
    const fields = [
        { value: 'state', label: 'State', type: 'text' },
        { value: 'city', label: 'City', type: 'text' },
        { value: 'donation', label: 'Donation', type: 'number' }, // treating as number/string
        { value: 'last_donation_date', label: 'Last Donation Date', type: 'date' },
        { value: 'last_contact_date', label: 'Last Contact Date', type: 'date' },
        { value: 'follow_up_date', label: 'Follow-up Date', type: 'date' },
        { value: 'follow_up_status', label: 'Follow-up Status', type: 'select', options: ['pending', 'completed', 'cancelled'] },
    ];

    const operators = {
        text: [
            { value: 'contains', label: 'Contains' },
            { value: 'equals', label: 'Equals' },
            { value: 'starts_with', label: 'Starts With' }
        ],
        number: [
            { value: 'equals', label: '=' },
            { value: 'gt', label: '>' },
            { value: 'lt', label: '<' },
            { value: 'gte', label: '>=' },
            { value: 'lte', label: '<=' }
        ],
        date: [
            { value: 'before', label: 'Before' },
            { value: 'after', label: 'After' },
            { value: 'on', label: 'On' },
            { value: 'days_ago_gt', label: 'More than X days ago' }, // "Not contacted in 6 months" -> last_contact_date days_ago_gt 180
            { value: 'days_ago_lt', label: 'Less than X days ago' },
            { value: 'in_next_days', label: 'In next X days' } // "Follow up in next 30 days" -> follow_up_date in_next_days 30
        ],
        select: [
            { value: 'equals', label: 'Is' },
            { value: 'not_equals', label: 'Is Not' }
        ]
    };

    const addRule = () => {
        onChange({
            ...criteria,
            rules: [...criteria.rules, { field: 'city', operator: 'contains', value: '' }]
        });
    };

    const removeRule = (index) => {
        const newRules = [...criteria.rules];
        newRules.splice(index, 1);
        onChange({ ...criteria, rules: newRules });
    };

    const updateRule = (index, key, value) => {
        const newRules = [...criteria.rules];
        newRules[index] = { ...newRules[index], [key]: value };
        
        // Reset operator if field changes to different type
        if (key === 'field') {
            const fieldType = fields.find(f => f.value === value)?.type || 'text';
            const defaultOp = operators[fieldType][0].value;
            newRules[index].operator = defaultOp;
            newRules[index].value = '';
        }

        onChange({ ...criteria, rules: newRules });
    };

    const [segmentName, setSegmentName] = useState("");

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-stone-50">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-stone-700">Advanced Filters / Segments</h3>
                <div className="flex gap-2">
                    {savedSegments && savedSegments.length > 0 && (
                         <Select onValueChange={(val) => onLoadSegment(savedSegments.find(s => s.id === val))}>
                            <SelectTrigger className="w-[180px] h-8 text-xs bg-white">
                                <SelectValue placeholder="Load Saved Segment" />
                            </SelectTrigger>
                            <SelectContent>
                                {savedSegments.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {criteria.rules.length === 0 ? (
                 <div className="text-center p-4 border-2 border-dashed border-stone-200 rounded text-stone-400 text-sm">
                     No filters applied.
                     <Button variant="link" onClick={addRule} className="text-teal-600 pl-1">Add Filter</Button>
                 </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-stone-600">Match</span>
                        <Select 
                            value={criteria.match} 
                            onValueChange={(val) => onChange({ ...criteria, match: val })}
                        >
                            <SelectTrigger className="w-[80px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="any">Any</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-stone-600">of the following rules:</span>
                    </div>

                    {criteria.rules.map((rule, idx) => {
                        const fieldDef = fields.find(f => f.value === rule.field) || fields[0];
                        const availableOps = operators[fieldDef.type] || operators.text;

                        return (
                            <div key={idx} className="flex gap-2 items-center">
                                <Select value={rule.field} onValueChange={(val) => updateRule(idx, 'field', val)}>
                                    <SelectTrigger className="w-[140px] h-9 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select value={rule.operator} onValueChange={(val) => updateRule(idx, 'operator', val)}>
                                    <SelectTrigger className="w-[140px] h-9 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableOps.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                {fieldDef.type === 'select' ? (
                                     <Select value={rule.value} onValueChange={(val) => updateRule(idx, 'value', val)}>
                                        <SelectTrigger className="flex-1 h-9 bg-white">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fieldDef.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input 
                                        type={fieldDef.type === 'date' || rule.operator.includes('days') ? (rule.operator.includes('days') ? 'number' : 'date') : fieldDef.type}
                                        value={rule.value} 
                                        onChange={(e) => updateRule(idx, 'value', e.target.value)}
                                        className="flex-1 h-9 bg-white"
                                        placeholder={rule.operator.includes('days') ? "Number of days" : "Value"}
                                    />
                                )}

                                <Button variant="ghost" size="icon" onClick={() => removeRule(idx)} className="h-9 w-9 text-stone-400 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        );
                    })}
                    
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={addRule} className="text-teal-700 border-teal-200 hover:bg-teal-50">
                            <Plus className="w-3 h-3 mr-1" /> Add Rule
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="ml-auto">
                                    <Save className="w-3 h-3 mr-1" /> Save Segment
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm">Save Current Segment</h4>
                                    <Input 
                                        placeholder="Segment Name" 
                                        value={segmentName}
                                        onChange={(e) => setSegmentName(e.target.value)}
                                    />
                                    <Button 
                                        className="w-full bg-teal-700" 
                                        disabled={!segmentName}
                                        onClick={() => { onSave(segmentName); setSegmentName(""); }}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            )}
        </div>
    );
}