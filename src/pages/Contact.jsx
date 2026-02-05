import React, { useState, useCallback, memo } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Phone, MapPin, Loader2, Send, CheckCircle2, ExternalLink } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from "sonner";

// Memoized contact card for performance
const ContactCard = memo(function ContactCard({ icon: Icon, iconBg, title, children }) {
    return (
        <Card className="bg-slate-50 border-none shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                <div className={`${iconBg} p-2.5 sm:p-3 rounded-full shrink-0`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    {title && <h3 className="font-serif font-bold text-base sm:text-lg text-stone-800 mb-1">{title}</h3>}
                    {children}
                </div>
            </CardContent>
        </Card>
    );
});

// Memoized contact person info
const ContactPerson = memo(function ContactPerson({ name, phone, email, isLast }) {
    return (
        <div className={!isLast ? "pb-3 mb-3 border-b border-stone-200" : ""}>
            <h4 className="font-serif font-bold text-sm sm:text-base text-stone-800">{name}</h4>
            <a 
                href={`tel:${phone.replace(/[^0-9]/g, '')}`} 
                className="flex items-center gap-2 text-stone-600 text-sm sm:text-base py-1.5 hover:text-teal-700 active:text-teal-800 touch-manipulation"
            >
                <Phone className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="underline underline-offset-2">{phone}</span>
            </a>
            <a 
                href={`mailto:${email}`} 
                className="flex items-center gap-2 text-stone-600 text-sm sm:text-base py-1.5 hover:text-teal-700 active:text-teal-800 touch-manipulation break-all"
            >
                <ExternalLink className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="underline underline-offset-2">{email}</span>
            </a>
        </div>
    );
});

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);

    const contactMutation = useMutation({
        mutationFn: async (data) => {
            const response = await base44.functions.invoke('submitContactForm', data);
            return response.data;
        },
        onSuccess: () => {
            setIsSubmitted(true);
            toast.success("Message sent successfully!");
        },
        onError: (error) => {
            const msg = error?.response?.data?.error || "Failed to send message. Please check the form and try again.";
            toast.error(msg);
        }
    });

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        contactMutation.mutate(formData);
    }, [formData, contactMutation]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    return (
        <div className="min-h-screen bg-stone-200 py-6 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
                <Breadcrumbs items={[{ label: 'Contact Us' }]} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
                    {/* Contact Information - stacks on mobile */}
                    <div className="space-y-5 sm:space-y-6 order-2 lg:order-1">
                        <div className="text-center lg:text-left">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-stone-900 mb-3 sm:mb-4">Get in Touch</h1>
                            <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
                                Questions about plot availability, genealogy services, or memorial planning? We're here to help.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:gap-5">
                            {/* Location Card */}
                            <ContactCard 
                                icon={MapPin} 
                                iconBg="bg-stone-200 text-stone-700"
                                title="Office Location"
                            >
                                <address className="text-stone-600 text-sm sm:text-base not-italic">
                                    1311 Fire Tower Road<br />
                                    Shongaloo, LA 71072
                                </address>
                                <a 
                                    href="https://maps.google.com/?q=1311+Fire+Tower+Road+Shongaloo+LA+71072"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-teal-700 text-sm mt-2 hover:underline active:text-teal-800 touch-manipulation"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Get Directions
                                </a>
                            </ContactCard>

                            {/* Contacts Card */}
                            <ContactCard 
                                icon={Phone} 
                                iconBg="bg-teal-100 text-teal-700"
                            >
                                <ContactPerson 
                                    name="Darrell Clendennen"
                                    phone="(540) 760-8863"
                                    email="clencsm@yahoo.com"
                                />
                                <ContactPerson 
                                    name="RD Teutsch"
                                    phone="(318) 846-2201"
                                    email="royteutsch@yahoo.com"
                                />
                                <div>
                                    <h4 className="font-serif font-bold text-sm sm:text-base text-stone-800">General Inquiries</h4>
                                    <Link 
                                        to={createPageUrl('MemberPortal?tab=messages')} 
                                        className="text-teal-700 text-sm sm:text-base hover:underline active:text-teal-800 touch-manipulation"
                                    >
                                        office@unionsprings.com
                                    </Link>
                                </div>
                            </ContactCard>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <Card className="border-none shadow-xl bg-white">
                        <CardHeader className="bg-stone-900 text-white rounded-t-xl p-8">
                            <CardTitle className="font-serif text-2xl">Send us a Message</CardTitle>
                            <CardDescription className="text-stone-300">
                                Fill out the form below and we'll get back to you as soon as possible.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            {isSubmitted ? (
                                <div className="text-center py-12 space-y-4 animate-in fade-in zoom-in duration-500">
                                    <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-serif text-stone-800">Message Sent</h3>
                                    <p className="text-stone-600 max-w-sm mx-auto">
                                        The message "<strong>{formData.subject}</strong>" was successfully sent, and within 24 hours, a team member will get back to you about your question.
                                    </p>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            setIsSubmitted(false);
                                            setFormData({ name: '', email: '', subject: '', message: '' });
                                        }}
                                        className="mt-6"
                                    >
                                        Send Another Message
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-stone-700">Full Name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="John Doe"
                                            minLength={2}
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="bg-stone-50 border-stone-200 focus:border-teal-500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-stone-700">Email Address</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="bg-stone-50 border-stone-200 focus:border-teal-500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="subject" className="text-stone-700">Subject</Label>
                                        <Input
                                            id="subject"
                                            name="subject"
                                            placeholder="e.g. Plot Reservation Inquiry"
                                            maxLength={200}
                                            required
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="bg-stone-50 border-stone-200 focus:border-teal-500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="message" className="text-stone-700">Message</Label>
                                        <Textarea
                                            id="message"
                                            name="message"
                                            placeholder="How can we help you?"
                                            minLength={10}
                                            required
                                            value={formData.message}
                                            onChange={handleChange}
                                            className="min-h-[150px] bg-stone-50 border-stone-200 focus:border-teal-500"
                                        />
                                    </div>

                                    <Button 
                                        type="submit" 
                                        className="w-full bg-red-700 hover:bg-red-800 text-white py-6 text-lg font-serif"
                                        disabled={contactMutation.isPending}
                                    >
                                        {contactMutation.isPending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5 mr-2" />
                                                Send Message
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}