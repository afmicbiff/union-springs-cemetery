import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';

export default function DeceasedEditDialog({ isOpen, onClose, deceased, mode = 'edit' }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({});
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (deceased) {
            setFormData({ ...deceased });
        } else {
            setFormData({
                first_name: '',
                middle_name: '',
                last_name: '',
                family_name: '',
                date_of_birth: '',
                date_of_death: '',
                obituary: '',
                notes: '',
                plot_location: '',
                veteran_status: false,
                burial_type: 'Casket',
                container_type: 'None',
                interment_date: ''
            });
        }
    }, [deceased, isOpen]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Date validation helpers
    const today = new Date().toISOString().split('T')[0];
    const dateErrors = React.useMemo(() => {
        const errors = {};
        const { date_of_birth, date_of_death, interment_date } = formData;

        const parseDateSafe = (v) => {
            if (!v) return null;
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : d;
        };

        const dob = parseDateSafe(date_of_birth);
        const dod = parseDateSafe(date_of_death);
        const doi = parseDateSafe(interment_date);
        const todayDate = new Date();
        const minDate = new Date('1700-01-01');

        if (dob) {
            if (dob > todayDate) errors.date_of_birth = 'Birth date is in the future';
            else if (dob < minDate) errors.date_of_birth = 'Birth date seems too far in the past';
        }
        if (dod) {
            if (dod > todayDate) errors.date_of_death = 'Death date is in the future';
            else if (dod < minDate) errors.date_of_death = 'Death date seems too far in the past';
        }
        if (dob && dod && dod < dob) {
            errors.date_of_death = 'Death date is before birth date';
        }
        if (dob && dod) {
            const ageAtDeath = (dod - dob) / (365.25 * 24 * 60 * 60 * 1000);
            if (ageAtDeath > 130) errors.date_of_death = `Age at death would be ${Math.round(ageAtDeath)} years — please verify`;
        }
        if (doi) {
            if (doi > todayDate) errors.interment_date = 'Interment date is in the future';
            if (dod && doi < dod) errors.interment_date = 'Interment date is before death date';
        }
        return errors;
    }, [formData.date_of_birth, formData.date_of_death, formData.interment_date]);

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            // Strip system/read-only fields before sending to API
            const { id, created_date, updated_date, created_by, created_by_id, is_sample, entity_name, app_id, is_deleted, deleted_date, environment, entity_type, status, ...cleanData } = data;
            if (mode === 'create') {
                return await base44.entities.Deceased.create(cleanData);
            } else {
                return await base44.entities.Deceased.update(id, cleanData);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deceased-admin-search'] });
            toast.success(mode === 'create' ? "Record created" : "Record updated");
            onClose();
        },
        onError: (err) => {
            toast.error("Failed to save: " + err.message);
        }
    });

    const generateObituary = async () => {
        if (!formData.first_name || !formData.last_name) {
            toast.error("Please enter at least a first and last name.");
            return;
        }

        setIsGenerating(true);
        try {
            const prompt = `Write a respectful, warm, and professional obituary for ${formData.first_name} ${formData.last_name}
            ${formData.family_name ? `(née ${formData.family_name})` : ''}.
            Born: ${formData.date_of_birth || 'Unknown'}
            Died: ${formData.date_of_death || 'Unknown'}
            ${formData.veteran_status ? 'They were a veteran.' : ''}
            Key details/Life events: ${formData.notes || 'No specific details provided, please write a general template.'}
            
            Format the output as plain text paragraphs.`;

            const res = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                add_context_from_internet: false
            });

            // InvokeLLM returns a string directly if no schema provided, or we might need to parse it if it returns an object.
            // The documentation says "returns a string" if schema not specified.
            // But wait, the integration definition says "returns a dict (so no need to parse it), otherwise returns a string."
            // Let's assume string for now or check response type.
            
            const obitText = typeof res === 'string' ? res : (res.content || res.result || JSON.stringify(res));
            
            handleChange('obituary', obitText);
            toast.success("Draft obituary generated");
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate obituary");
        } finally {
            setIsGenerating(false);
        }
    };

    const hasDateErrors = Object.keys(dateErrors).length > 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (hasDateErrors) {
            toast.error("Please fix the date errors before saving.");
            return;
        }
        saveMutation.mutate(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Add Deceased Record' : 'Edit Deceased Record'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">First Name *</Label>
                            <Input 
                                id="first_name" 
                                value={formData.first_name || ''} 
                                onChange={(e) => handleChange('first_name', e.target.value)} 
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="middle_name">Middle Name</Label>
                            <Input 
                                id="middle_name" 
                                value={formData.middle_name || ''} 
                                onChange={(e) => handleChange('middle_name', e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name *</Label>
                            <Input 
                                id="last_name" 
                                value={formData.last_name || ''} 
                                onChange={(e) => handleChange('last_name', e.target.value)} 
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="family_name">Maiden/Family Name</Label>
                            <Input 
                                id="family_name" 
                                value={formData.family_name || ''} 
                                onChange={(e) => handleChange('family_name', e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="date_of_birth">Date of Birth</Label>
                            <Input 
                                id="date_of_birth" 
                                type="date"
                                max={today}
                                value={formData.date_of_birth || ''} 
                                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                                className={dateErrors.date_of_birth ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                            />
                            {dateErrors.date_of_birth && (
                                <p className="text-xs text-red-600 font-medium">{dateErrors.date_of_birth}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="date_of_death">Date of Death</Label>
                            <Input 
                                id="date_of_death" 
                                type="date"
                                max={today}
                                min={formData.date_of_birth || undefined}
                                value={formData.date_of_death || ''} 
                                onChange={(e) => handleChange('date_of_death', e.target.value)}
                                className={dateErrors.date_of_death ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                            />
                            {dateErrors.date_of_death && (
                                <p className="text-xs text-red-600 font-medium">{dateErrors.date_of_death}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="interment_date">Interment Date</Label>
                            <Input 
                                id="interment_date" 
                                type="date"
                                max={today}
                                min={formData.date_of_death || undefined}
                                value={formData.interment_date || ''} 
                                onChange={(e) => handleChange('interment_date', e.target.value)}
                                className={dateErrors.interment_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                            />
                            {dateErrors.interment_date && (
                                <p className="text-xs text-red-600 font-medium">{dateErrors.interment_date}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="plot_location">Plot Location</Label>
                            <Input 
                                id="plot_location" 
                                value={formData.plot_location || ''} 
                                onChange={(e) => handleChange('plot_location', e.target.value)} 
                                placeholder="Section-Row-Grave"
                            />
                        </div>
                        <div className="flex items-center space-x-2 pt-8">
                            <Switch 
                                id="veteran_status" 
                                checked={formData.veteran_status || false}
                                onCheckedChange={(checked) => handleChange('veteran_status', checked)}
                            />
                            <Label htmlFor="veteran_status">Veteran Status</Label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                         <div className="space-y-2">
                            <Label>Burial Type</Label>
                            <Select 
                                value={formData.burial_type || 'Casket'} 
                                onValueChange={(val) => handleChange('burial_type', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Casket">Casket</SelectItem>
                                    <SelectItem value="Urn">Urn</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Container Type</Label>
                            <Select 
                                value={formData.container_type || 'None'} 
                                onValueChange={(val) => handleChange('container_type', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="None">None</SelectItem>
                                    <SelectItem value="Liner">Liner</SelectItem>
                                    <SelectItem value="Vault">Vault</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes & Key Life Events (for AI)</Label>
                        <Textarea 
                            id="notes" 
                            value={formData.notes || ''} 
                            onChange={(e) => handleChange('notes', e.target.value)} 
                            placeholder="Enter key facts, family members, career, hobbies, etc."
                            className="h-24"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="obituary">Obituary</Label>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={generateObituary}
                                disabled={isGenerating}
                                className="text-teal-600 border-teal-200 hover:bg-teal-50"
                            >
                                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                Generate with AI
                            </Button>
                        </div>
                        <Textarea 
                            id="obituary" 
                            value={formData.obituary || ''} 
                            onChange={(e) => handleChange('obituary', e.target.value)} 
                            className="h-48 font-serif"
                            placeholder="Full obituary text..."
                        />
                    </div>
                    
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={saveMutation.isPending || hasDateErrors}>
                            {saveMutation.isPending ? "Saving..." : "Save Record"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}