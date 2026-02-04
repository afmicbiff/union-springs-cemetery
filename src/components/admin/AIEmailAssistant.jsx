import React, { useState, useCallback, memo } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, RefreshCw, Wand2, Check, Microscope, Loader2, AlertCircle } from 'lucide-react';
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Memoized result display
const ResultDisplay = memo(function ResultDisplay({ result, analysisResult, mode, onApply }) {
    const subject = result?.subject || analysisResult?.improved_version?.subject;
    const body = result?.body || analysisResult?.improved_version?.body;
    
    if (!subject && !body) return null;
    
    return (
        <div className="mt-4 sm:mt-6 pt-4 border-t border-stone-200 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-3">
                <h3 className="font-medium text-stone-900 flex items-center gap-2 text-sm sm:text-base">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600" />
                    {mode === 'analyze' ? 'Improved Version' : 'Generated Result'}
                </h3>
                <div>
                    <span className="text-[10px] sm:text-xs font-semibold text-stone-500 uppercase">Subject</span>
                    <div className="p-2 bg-stone-50 rounded border border-stone-200 text-xs sm:text-sm font-medium">
                        {subject}
                    </div>
                </div>
                <div>
                    <span className="text-[10px] sm:text-xs font-semibold text-stone-500 uppercase">Body</span>
                    <div className="p-2 bg-stone-50 rounded border border-stone-200 text-xs sm:text-sm whitespace-pre-wrap max-h-[150px] sm:max-h-[200px] overflow-y-auto">
                        {body}
                    </div>
                </div>
                <Button 
                    onClick={() => onApply(result || analysisResult?.improved_version)} 
                    className="w-full bg-green-600 hover:bg-green-700 h-8 sm:h-9 text-xs sm:text-sm"
                >
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Apply to Editor
                </Button>
            </div>
        </div>
    );
});

function AIEmailAssistant({ onApply, currentSubject = "", currentBody = "", recipientContext = null }) {
    const [mode, setMode] = useState("generate");
    const [context, setContext] = useState("");
    const [tone, setTone] = useState("Professional");
    const [refineInstructions, setRefineInstructions] = useState("");
    const [generatedResult, setGeneratedResult] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);

    const aiMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await base44.functions.invoke('aiCommunicationAssistant', payload);
            if (res.data?.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: (data) => {
            setGeneratedResult(data);
            toast.success("Content generated successfully");
        },
        onError: (err) => toast.error("AI Assistant failed: " + (err?.message || 'Unknown error'))
    });

    const handleGenerate = useCallback(() => {
        if (!context?.trim()) {
            toast.error("Please provide some context for the email.");
            return;
        }
        aiMutation.mutate({
            action: 'generate_draft',
            data: { context: context.trim(), recipientInfo: recipientContext, tone }
        });
    }, [context, recipientContext, tone, aiMutation]);

    const handleRefine = useCallback(() => {
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
    }, [currentSubject, currentBody, refineInstructions, aiMutation]);

    const handleAnalyze = useCallback(() => {
        if (!currentSubject && !currentBody) {
            toast.error("No content to analyze.");
            return;
        }
        aiMutation.mutate({
            action: 'analyze_draft',
            data: { draft: { subject: currentSubject, body: currentBody } }
        }, {
            onSuccess: (data) => {
                setAnalysisResult(data);
                setGeneratedResult(data?.improved_version);
            }
        });
    }, [currentSubject, currentBody, aiMutation]);

    return (
        <div className="space-y-3 sm:space-y-4 p-1">
            <Tabs value={mode} onValueChange={setMode} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-8 sm:h-9">
                    <TabsTrigger value="generate" className="text-[10px] sm:text-sm gap-1 sm:gap-2">
                        <Wand2 className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Generate</span><span className="xs:hidden">Gen</span>
                    </TabsTrigger>
                    <TabsTrigger value="refine" className="text-[10px] sm:text-sm gap-1 sm:gap-2">
                        <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" /> Refine
                    </TabsTrigger>
                    <TabsTrigger value="analyze" className="text-[10px] sm:text-sm gap-1 sm:gap-2">
                        <Microscope className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Analyze</span><span className="xs:hidden">Check</span>
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="generate" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                    <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-medium">What is this email about?</label>
                        <Textarea 
                            placeholder="e.g., Thanking members for their recent donation..."
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            rows={3}
                            className="text-sm"
                            maxLength={1000}
                        />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-medium">Tone</label>
                        <Select value={tone} onValueChange={setTone}>
                            <SelectTrigger className="h-8 sm:h-9 text-sm">
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
                        disabled={aiMutation.isPending || !context?.trim()} 
                        className="w-full bg-teal-600 hover:bg-teal-700 h-8 sm:h-9 text-xs sm:text-sm"
                    >
                        {aiMutation.isPending ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />}
                        Generate Draft
                    </Button>
                </TabsContent>

                <TabsContent value="refine" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                    <div className="bg-stone-50 p-2 sm:p-3 rounded-md text-[10px] sm:text-xs text-stone-500 border border-stone-200">
                        <strong>Analyzing:</strong> {currentSubject ? `"${currentSubject.slice(0, 50)}${currentSubject.length > 50 ? '...' : ''}"` : "No Subject"}
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-medium">How should we improve it?</label>
                        <Textarea 
                            placeholder="e.g., Make it more concise, fix grammar..."
                            value={refineInstructions}
                            onChange={(e) => setRefineInstructions(e.target.value)}
                            rows={3}
                            className="text-sm"
                            maxLength={500}
                        />
                    </div>
                    <Button 
                        onClick={handleRefine} 
                        disabled={aiMutation.isPending || !refineInstructions?.trim()} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-8 sm:h-9 text-xs sm:text-sm"
                    >
                        {aiMutation.isPending ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />}
                        Refine Draft
                    </Button>
                </TabsContent>

                <TabsContent value="analyze" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                    <div className="bg-stone-50 p-2 sm:p-3 rounded-md text-[10px] sm:text-xs text-stone-500 border border-stone-200">
                        <strong>Analyzing:</strong> {currentSubject ? `"${currentSubject.slice(0, 50)}${currentSubject.length > 50 ? '...' : ''}"` : "No Subject"}
                    </div>
                    <Button 
                        onClick={handleAnalyze} 
                        disabled={aiMutation.isPending || (!currentSubject && !currentBody)} 
                        className="w-full bg-purple-600 hover:bg-purple-700 h-8 sm:h-9 text-xs sm:text-sm"
                    >
                        {aiMutation.isPending ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" /> : <Microscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />}
                        Analyze Draft
                    </Button>

                    {analysisResult && (
                        <div className="space-y-2 sm:space-y-3 bg-purple-50 p-2 sm:p-3 rounded-md border border-purple-100 text-xs sm:text-sm animate-in fade-in">
                            <div>
                                <h4 className="font-semibold text-purple-900 mb-1 text-xs sm:text-sm">Analysis</h4>
                                <p className="text-purple-800 leading-relaxed text-xs sm:text-sm">{analysisResult.analysis}</p>
                            </div>
                            {analysisResult.suggestions?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-purple-900 mb-1 text-xs sm:text-sm">Suggestions</h4>
                                    <ul className="list-disc pl-3 sm:pl-4 space-y-0.5 sm:space-y-1 text-purple-800 text-xs sm:text-sm">
                                        {analysisResult.suggestions.map((s, i) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <ResultDisplay 
                result={generatedResult} 
                analysisResult={analysisResult} 
                mode={mode} 
                onApply={onApply} 
            />
        </div>
    );
}

export default memo(AIEmailAssistant);