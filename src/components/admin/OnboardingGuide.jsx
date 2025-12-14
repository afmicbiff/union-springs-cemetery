import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, FileText, AlertTriangle, Info, ChevronDown } from 'lucide-react';

const CustomAccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={`flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 ${className || ''}`}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
CustomAccordionTrigger.displayName = "CustomAccordionTrigger";

export default function OnboardingGuide() {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-teal-600"/> HR Onboarding Guide
                </CardTitle>
                <CardDescription>
                    Step-by-step guide for new hires, volunteers, and mandatory paperwork.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    
                    {/* Step 1: Mandatory Forms */}
                    <AccordionItem value="item-1">
                        <CustomAccordionTrigger className="text-stone-800 font-semibold">
                            1. Forms the Employee Must Complete
                        </CustomAccordionTrigger>
                        <AccordionContent className="space-y-4 text-stone-600">
                            <p className="text-sm">These are essential for payroll and legal verification.</p>
                            <ul className="space-y-3">
                                <li className="flex gap-2 items-start">
                                    <FileText className="w-4 h-4 mt-1 text-teal-600 flex-shrink-0" />
                                    <div>
                                        <span className="font-bold block">Form I-9 (Federal)</span>
                                        Employment Eligibility Verification. Mandatory for every US employee.
                                    </div>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <FileText className="w-4 h-4 mt-1 text-teal-600 flex-shrink-0" />
                                    <div>
                                        <span className="font-bold block">Form W-4 (Federal)</span>
                                        For federal tax withholding.
                                    </div>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <FileText className="w-4 h-4 mt-1 text-teal-600 flex-shrink-0" />
                                    <div>
                                        <span className="font-bold block">Form L-4 (State)</span>
                                        Louisiana Employee's Withholding Exemption Certificate. 
                                        <br/>
                                        <span className="text-xs italic bg-yellow-50 p-1 rounded">Note: If not filled, withhold at highest rate (0 exemptions).</span>
                                    </div>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <FileText className="w-4 h-4 mt-1 text-amber-600 flex-shrink-0" />
                                    <div>
                                        <span className="font-bold block">Minor Employment Certificate</span>
                                        Required if under 18. Obtain from local school board or LA Workforce Commission.
                                    </div>
                                </li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Step 2: Notifications */}
                    <AccordionItem value="item-2">
                        <CustomAccordionTrigger className="text-stone-800 font-semibold">
                            2. Notices You Must Provide
                        </CustomAccordionTrigger>
                        <AccordionContent className="space-y-4 text-stone-600">
                            <ul className="space-y-3">
                                <li className="flex gap-2 items-start">
                                    <AlertTriangle className="w-4 h-4 mt-1 text-teal-600 flex-shrink-0" />
                                    <div>
                                        <span className="font-bold block">Notification of Pay (R.S. 23:633)</span>
                                        Legally required to notify employee of pay rate and frequency at hire.
                                        <br/>
                                        <span className="text-xs font-semibold text-teal-700">Best Practice: Have them sign an Offer Letter or Notice of Pay Rate.</span>
                                    </div>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <AlertTriangle className="w-4 h-4 mt-1 text-teal-600 flex-shrink-0" />
                                    <div>
                                        <span className="font-bold block">Workers' Compensation Notice</span>
                                        Verify provision of info regarding rights. Include written notice in onboarding packet.
                                    </div>
                                </li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Step 3: Employer Actions */}
                    <AccordionItem value="item-3">
                        <CustomAccordionTrigger className="text-stone-800 font-semibold">
                            3. Employer Action Items
                        </CustomAccordionTrigger>
                        <AccordionContent className="space-y-4 text-stone-600">
                            <div className="bg-stone-50 p-3 rounded-md border border-stone-200">
                                <h4 className="font-bold text-stone-800 mb-1">Report to Louisiana Directory of New Hires</h4>
                                <p className="text-sm mb-2">Must report every new hire/re-hire within <span className="font-bold text-red-600">20 days</span>.</p>
                                <a href="https://newhire.library.la.gov" target="_blank" rel="noreferrer" className="text-teal-700 hover:underline text-sm font-medium">
                                    Visit Louisiana New Hire Reporting Website &rarr;
                                </a>
                                <p className="text-xs mt-2 text-stone-400">Used to enforce child support orders.</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Step 4: Posters */}
                    <AccordionItem value="item-4">
                        <CustomAccordionTrigger className="text-stone-800 font-semibold">
                            4. Mandatory Workplace Posters
                        </CustomAccordionTrigger>
                        <AccordionContent className="space-y-2 text-stone-600">
                            <p className="text-sm">Post in visible area (break room) or provide digital copies for remote workers.</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <Badge variant="outline">Age Discrimination</Badge>
                                <Badge variant="outline">Genetic Discrimination</Badge>
                                <Badge variant="outline">Minor Labor Law</Badge>
                                <Badge variant="outline">Out-of-State Motor Vehicles</Badge>
                                <Badge variant="outline">Timely Payment of Wages</Badge>
                                <Badge variant="outline">Unemployment Insurance</Badge>
                                <Badge variant="outline">Workers' Compensation</Badge>
                                <Badge variant="outline">Independent Contractor vs Employee</Badge>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                </Accordion>
            </CardContent>
        </Card>
    );
}