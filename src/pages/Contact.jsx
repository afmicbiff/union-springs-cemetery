import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Phone, MapPin, Loader2, Send, CheckCircle2 } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";
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
            toast.error("Failed to send message. Please try again.");
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
                        </div>

                        <div className="grid gap-6">
                            <Card className="bg-slate-50 border-none shadow-md hover:shadow-lg transition-shadow">
                                <CardContent className="flex items-start gap-4 p-6">
                                    <div className="bg-teal-100 p-3 rounded-full">
                                        <Phone className="w-6 h-6 text-teal-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-bold text-lg text-stone-800">Phone</h3>
                                        <p className="text-stone-600 mb-1">Available Mon-Fri, 9am - 5pm</p>
                                        <a href="tel:5551234567" className="text-teal-700 font-semibold hover:underline text-lg">
                                            (555) 123-4567
                                        </a>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-50 border-none shadow-md hover:shadow-lg transition-shadow">
                                <CardContent className="flex items-start gap-4 p-6">
                                    <div className="bg-red-100 p-3 rounded-full">
                                        <Mail className="w-6 h-6 text-red-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-bold text-lg text-stone-800">Email</h3>
                                        <p className="text-stone-600 mb-1">For general inquiries</p>
                                        <a href="mailto:office@unionsprings.com" className="text-red-700 font-semibold hover:underline text-lg">
                                            office@unionsprings.com
                                        </a>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-50 border-none shadow-md hover:shadow-lg transition-shadow">
                                <CardContent className="flex items-start gap-4 p-6">
                                    <div className="bg-stone-200 p-3 rounded-full">
                                        <MapPin className="w-6 h-6 text-stone-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif font-bold text-lg text-stone-800">Office Location</h3>
                                        <p className="text-stone-600">
                                            123 Granite Way<br />
                                            Union Springs, USA
                                        </p>
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
                                    <h3 className="text-2xl font-serif text-stone-800">Thank You!</h3>
                                    <p className="text-stone-600 max-w-sm mx-auto">
                                        Your message has been sent successfully. We have sent a confirmation email to <strong>{formData.email}</strong>.
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