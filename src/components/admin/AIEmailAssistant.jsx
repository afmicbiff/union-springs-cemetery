import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, RefreshCw, Wand2, Check } from 'lucide-react';
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AIEmailAssistant({ onApply, currentSubject = "", currentBody = "", recipientContext = null }) {
    const [mode, setMode] = useState("generate"); // generate | refine
    const [context, setContext] = useState("");
    const [tone, setTone] = useState("Professional");
    const [refineInstructions, setRefineInstructions] = useState("");
    const [generatedResult, setGeneratedResult] = useState(null);

    const aiMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await base44.functions.invoke('aiCommunicationAssistant', payload);
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: (data) => {
            setGeneratedResult(data);
            toast.success("Content generated successfully");
        },
        onError: (err) => toast.error("AI Assistant failed: " + err.message)
    });

    const handleGenerate = () => {
        if (!context) {
            toast.error("Please provide some context for the email.");
            return;
        }
        aiMutation.mutate({
            action: 'generate_draft',
            data: {
                context,
                recipientInfo: recipientContext,
                tone
            }
        });
    };

    const handleRefine = () => {
        if (!currentSubject && !currentBody) {
            toast.error("No content to refine.");
            return;
        }
        aiMutation.mutate({
            action: 'refine_draft',
            data: {
                currentDraft: { subject: currentSubject, body: currentBody },
                instructions: refineInstructions
            }
        });
    };

    return (
        <div className="space-y-4 p-1">
            <Tabs value={mode} onValueChange={setMode} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="generate">
                        <Wand2 className="w-4 h-4 mr-2" /> Generate New
                    </TabsTrigger>
                    <TabsTrigger value="refine">
                        <RefreshCw className="w-4 h-4 mr-2" /> Refine Existing
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="generate" className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">What is this email about?</label>
                        <Textarea 
                            placeholder="e.g., Thanking members for their recent donation and inviting them to the upcoming memorial service..."
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tone</label>
                        <Select value={tone} onValueChange={setTone}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Professional">Professional</SelectItem>
                                <SelectItem value="Empathetic">Empathetic / Compassionate</SelectItem>
                                <SelectItem value="Friendly">Friendly / Warm</SelectItem>
                                <SelectItem value="Formal">Formal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button 
                        onClick={handleGenerate} 
                        disabled={aiMutation.isPending || !context} 
                        className="w-full bg-teal-600 hover:bg-teal-700"
                    >
                        {aiMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Generate Draft
                    </Button>
                </TabsContent>

                <TabsContent value="refine" className="space-y-4 mt-4">
                    <div className="bg-stone-50 p-3 rounded-md text-xs text-stone-500 border border-stone-200">
                        <strong>Analyzing:</strong> {currentSubject ? `"${currentSubject}"` : "No Subject"}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">How should we improve it?</label>
                        <Textarea 
                            placeholder="e.g., Make it more concise, fix grammar, make it sound more sympathetic..."
                            value={refineInstructions}
                            onChange={(e) => setRefineInstructions(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <Button 
                        onClick={handleRefine} 
                        disabled={aiMutation.isPending || !refineInstructions} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                        {aiMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Refine Draft
                    </Button>
                </TabsContent>
            </Tabs>

            {generatedResult && (
                <div className="mt-6 pt-4 border-t border-stone-200 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs font-semibold text-stone-500 uppercase">Generated Subject</span>
                            <div className="p-2 bg-stone-50 rounded border border-stone-200 text-sm font-medium">
                                {generatedResult.subject}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-stone-500 uppercase">Generated Body</span>
                            <div className="p-2 bg-stone-50 rounded border border-stone-200 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                {generatedResult.body}
                            </div>
                        </div>
                        <Button 
                            onClick={() => onApply(generatedResult)} 
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            <Check className="w-4 h-4 mr-2" /> Apply to Editor
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}