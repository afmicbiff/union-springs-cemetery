import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, Info } from 'lucide-react';

const OnboardingGuide = memo(function OnboardingGuide() {
    return (
        <Card className="h-full">
            <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600"/> HR Guide
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Forms and requirements for new hires.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
                <Accordion type="single" collapsible className="w-full">
                    
                    {/* Step 1: Mandatory Forms */}
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-stone-800 font-semibold text-sm sm:text-base py-3">
                            1. Required Forms
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 text-stone-600 text-xs sm:text-sm">
                            <ul className="space-y-2">
                                <li className="flex gap-2 items-start">
                                    <FileText className="w-3.5 h-3.5 mt-0.5 text-teal-600 flex-shrink-0" />
                                    <div><span className="font-semibold">Form I-9</span> - Employment Eligibility</div>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <FileText className="w-3.5 h-3.5 mt-0.5 text-teal-600 flex-shrink-0" />
                                    <div><span className="font-semibold">Form W-4</span> - Federal Tax Withholding</div>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <FileText className="w-3.5 h-3.5 mt-0.5 text-teal-600 flex-shrink-0" />
                                    <div><span className="font-semibold">Form L-4</span> - LA State Withholding</div>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <FileText className="w-3.5 h-3.5 mt-0.5 text-amber-600 flex-shrink-0" />
                                    <div><span className="font-semibold">Minor Cert</span> - If under 18</div>
                                </li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Step 2: Notifications */}
                    <AccordionItem value="item-2">
                        <AccordionTrigger className="text-stone-800 font-semibold text-sm sm:text-base py-3">
                            2. Required Notices
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 text-stone-600 text-xs sm:text-sm">
                            <ul className="space-y-2">
                                <li className="flex gap-2 items-start">
                                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-teal-600 flex-shrink-0" />
                                    <div><span className="font-semibold">Pay Notice</span> - Rate & frequency</div>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-teal-600 flex-shrink-0" />
                                    <div><span className="font-semibold">Workers' Comp</span> - Rights info</div>
                                </li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Step 3: Employer Actions */}
                    <AccordionItem value="item-3">
                        <AccordionTrigger className="text-stone-800 font-semibold text-sm sm:text-base py-3">
                            3. Employer Actions
                        </AccordionTrigger>
                        <AccordionContent className="text-stone-600 text-xs sm:text-sm">
                            <div className="bg-stone-50 p-2 rounded border">
                                <p className="font-semibold">Report to LA New Hires within <span className="text-red-600">20 days</span></p>
                                <a href="https://newhire.library.la.gov" target="_blank" rel="noreferrer" className="text-teal-700 hover:underline text-xs">
                                    newhire.library.la.gov →
                                </a>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Step 4: Posters - hidden on mobile */}
                    <AccordionItem value="item-4" className="hidden sm:block">
                        <AccordionTrigger className="text-stone-800 font-semibold text-sm sm:text-base py-3">
                            4. Workplace Posters
                        </AccordionTrigger>
                        <AccordionContent className="text-stone-600 text-xs sm:text-sm">
                            <div className="flex flex-wrap gap-1.5">
                                <Badge variant="outline" className="text-[10px]">Age Discrimination</Badge>
                                <Badge variant="outline" className="text-[10px]">Workers' Comp</Badge>
                                <Badge variant="outline" className="text-[10px]">Minor Labor</Badge>
                                <Badge variant="outline" className="text-[10px]">Wages</Badge>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                </Accordion>
            </CardContent>
        </Card>
    );
});

export default OnboardingGuide;