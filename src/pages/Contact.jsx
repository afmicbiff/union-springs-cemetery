import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Phone, MapPin, Loader2, Send, CheckCircle2, Map, Search } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from "sonner";

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
            console.error(error);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        contactMutation.mutate(formData);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <Breadcrumbs items={[{ label: 'Contact Us' }]} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Contact Information */}
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-6">Get in Touch</h1>
                            <p className="text-stone-600 text-lg leading-relaxed">
                                Whether you have questions about plot availability, genealogy services, or memorial planning, our compassionate staff is here to assist you.
                            </p>
                            <p className="mt-2 text-stone-700">Need assistance locating a loved one? Our board is here to help.</p>
                        </div>

                        <div className="grid gap-6">
                            <Card className="bg-slate-50 border-none shadow-md hover:shadow-lg transition-shadow">
                                <CardContent className="flex items-start gap-3 p-4 sm:gap-4 sm:p-6">
                                    <div className="bg-stone-200 p-2 sm:p-3 rounded-full">
                                        <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-stone-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-bold text-base sm:text-lg text-stone-800">Office Location</h3>
                                        <p className="text-stone-600 text-sm sm:text-base">
                                            1311 Fire Tower Road<br />
                                            Shongaloo, Webster Parish, Louisiana, 71072
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-50 border-none shadow-md hover:shadow-lg transition-shadow">
                                <CardContent className="flex items-start gap-3 p-4 sm:gap-4 sm:p-6">
                                    <div className="bg-teal-100 p-2 sm:p-3 rounded-full">
                                        <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-teal-700" />
                                    </div>
                                    <div className="space-y-4 w-full">
                                        <div>
                                            <h3 className="font-serif font-bold text-base sm:text-lg text-stone-800">Darrell Clendennen</h3>
                                            <p className="text-stone-600 text-sm sm:text-base">Phone: <a href="tel:5407608863" className="hover:text-teal-700 hover:underline">(540) 760-8863</a></p>
                                            <p className="text-stone-600 text-sm sm:text-base">Email: <a href="mailto:clencsm@yahoo.com" className="hover:text-teal-700 hover:underline">clencsm@yahoo.com</a></p>
                                        </div>
                                        <div className="border-t border-stone-200" />
                                        <div>
                                            <h3 className="font-serif font-bold text-base sm:text-lg text-stone-800">RD Teutsch</h3>
                                            <p className="text-stone-600 text-sm sm:text-base">Phone: <a href="tel:3188462201" className="hover:text-teal-700 hover:underline">(318) 846-2201</a></p>
                                            <p className="text-stone-600 text-sm sm:text-base">Email: <a href="mailto:royteutsch@yahoo.com" className="hover:text-teal-700 hover:underline">royteutsch@yahoo.com</a></p>
                                        </div>
                                        <div className="border-t border-stone-200" />
                                        <div>
                                            <h3 className="font-serif font-bold text-base sm:text-lg text-stone-800">General Inquiries</h3>
                                            <p className="text-stone-600 text-sm sm:text-base">Email: <Link to={createPageUrl('MemberPortal?tab=messages')} className="hover:text-teal-700 hover:underline">office@unionsprings.com</Link></p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
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