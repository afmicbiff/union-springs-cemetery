import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Phone, ExternalLink } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";

// Memoized section component - GPU compositing hint for smooth scrolling
const ServiceSection = memo(function ServiceSection({ title, children, className = "" }) {
    return (
        <section 
            className={`bg-slate-50 p-5 sm:p-6 md:p-8 rounded-lg shadow-md ${className}`}
            style={{ contain: 'layout style paint' }}
        >
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 mb-3 sm:mb-4">{title}</h3>
            {children}
        </section>
    );
});

// Memoized list item for external links - precompute URL display
const ExternalLinkItem = memo(function ExternalLinkItem({ name, url }) {
    const displayUrl = useMemo(() => 
        url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), 
        [url]
    );
    return (
        <li className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-h-[44px] py-1">
            <span className="font-semibold text-stone-700">{name}:</span>
            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-teal-700 hover:text-teal-800 active:text-teal-900 underline underline-offset-2 flex items-center gap-1.5 touch-manipulation break-all min-h-[44px] py-2"
            >
                {displayUrl}
                <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
            </a>
        </li>
    );
});

// Static data moved outside component to prevent re-creation on each render
const FUNERAL_CONTACTS = [
    { name: "Bailey Funeral Home", url: "https://www.baileyfuneralhome.net" },
    { name: "Smith Monument", url: "http://www.smithmonumentcompany.com/" },
    { name: "Central Monument", url: "https://centralmonument.com/" }
];

const BREADCRUMB_ITEMS = [{ label: 'Services' }];

export default function ServicesPage() {
    return (
        <div 
            className="min-h-screen bg-stone-200 py-6 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 md:space-y-12">
                <Breadcrumbs items={BREADCRUMB_ITEMS} />
                
                {/* Header */}
                <header className="text-center space-y-4 sm:space-y-6">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-stone-900">Services</h1>
                    <div className="w-20 sm:w-24 h-1 bg-red-700 mx-auto"></div>
                </header>

                {/* Main Content - contain for paint optimization */}
                <div 
                    className="bg-white rounded-lg shadow-md p-5 sm:p-6 md:p-8 space-y-6 sm:space-y-8"
                    style={{ contain: 'layout style' }}
                >
                    
                    {/* Staff Services */}
                    <section>
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 mb-3 sm:mb-4">
                            The staff at Union Springs Cemetery will:
                        </h2>
                        <ol className="list-decimal list-outside ml-5 sm:ml-6 space-y-2 sm:space-y-3 text-stone-600 text-sm sm:text-base leading-relaxed">
                            <li>Provide proper care, maintenance, and preservation of grave sites and cemetery grounds.</li>
                            <li>Maintain and improve cemetery infrastructure, including grounds, fences, and grave markers.</li>
                            <li>Raise and manage financial resources for the ongoing upkeep of the cemetery.</li>
                            <li>Foster a fraternal and cooperative spirit among members of the Association.</li>
                        </ol>
                    </section>

                    {/* Perpetual Funds */}
                    <section>
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 mb-3 sm:mb-4">Perpetual Funds</h2>
                        <ol className="list-decimal list-outside ml-5 sm:ml-6 space-y-3 sm:space-y-4 text-stone-600 text-sm sm:text-base leading-relaxed">
                            <li>Funds designated for perpetual care shall be preserved in an insured financial institution in Webster Parish, Louisiana. These funds generate interest as Perpetual Care Fund assets.</li>
                            <li>Interest earned shall be deposited into the Association's general fund and expended as directed by the Executive Board.</li>
                        </ol>
                    </section>

                    {/* Burial Plots */}
                    <section>
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 mb-3 sm:mb-4">Burial Plots</h2>
                        <ol className="list-decimal list-outside ml-5 sm:ml-6 space-y-3 sm:space-y-4 text-stone-600 text-sm sm:text-base leading-relaxed">
                            <li>Plot reservations shall be managed by the President, Vice President, or Caretaker. Unauthorized markings are not valid.</li>
                            <li>All burial plots are <strong className="text-stone-800">5 feet wide × 10 feet long</strong>.</li>
                            <li>Only authorized personnel may reserve or mark grave sites.</li>
                            <li>All grave sites remain property of the Association with no right of transfer. Reserved plots cannot be transferred to others.</li>
                            <li className="bg-teal-50 p-3 sm:p-4 rounded-lg border-l-4 border-teal-600">
                                <strong className="text-teal-800 block mb-1">Maintenance Fees</strong>
                                <span className="text-teal-700">A minimum donation of <strong>$400</strong> secures a plot.</span>
                                <span className="block text-stone-600 mt-1 text-xs sm:text-sm">Members must reaffirm intent every 5 years. Unverified plots revert to the Association after 1 year.</span>
                            </li>
                        </ol>
                    </section>

                    {/* Urns */}
                    <section>
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 mb-3 sm:mb-4">Urns</h2>
                        <p className="text-stone-700 font-semibold mb-3 text-sm sm:text-base">Maximum of 3 urns per plot</p>
                        <ol className="list-decimal list-outside ml-5 sm:ml-6 space-y-3 text-stone-600 text-sm sm:text-base leading-relaxed">
                            <li>First urn: 12" from headstone, centered. Each subsequent urn: 12" apart in the row.</li>
                            <li><strong>Size limits:</strong> Max 200 cubic inches, 9" tall, 7" diameter.</li>
                            <li>Placement regulated and mapped by the Association.</li>
                        </ol>
                    </section>

                    {/* Allowed Services */}
                    <section className="bg-stone-50 p-4 sm:p-5 rounded-lg">
                        <h2 className="text-lg sm:text-xl font-serif font-bold text-stone-800 mb-3">We offer:</h2>
                        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                            <li className="flex items-center gap-2 text-stone-700 font-medium text-sm sm:text-base">
                                <span className="w-2 h-2 bg-teal-600 rounded-full shrink-0"></span>
                                Traditional Burial Plots
                            </li>
                            <li className="flex items-center gap-2 text-stone-700 font-medium text-sm sm:text-base">
                                <span className="w-2 h-2 bg-teal-600 rounded-full shrink-0"></span>
                                Cremation Niches
                            </li>
                            <li className="flex items-center gap-2 text-stone-700 font-medium text-sm sm:text-base">
                                <span className="w-2 h-2 bg-teal-600 rounded-full shrink-0"></span>
                                Family Estates
                            </li>
                        </ul>
                    </section>
                </div>

                {/* CTA Button - sticky on mobile for easy access */}
                <div className="flex justify-center px-0 sm:px-4">
                    <Link to={createPageUrl('Contact')} className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-red-800 hover:bg-red-900 active:bg-red-950 text-white font-serif px-6 h-14 sm:h-auto sm:py-4 text-base sm:text-lg rounded-none sm:rounded-lg shadow-lg flex items-center justify-center gap-2.5 touch-manipulation will-change-transform active:scale-[0.98] transition-transform">
                            <Phone className="w-5 h-5 shrink-0" aria-hidden="true" />
                            <span>Contact the Administrator</span>
                        </Button>
                    </Link>
                </div>

                {/* Service Cards Grid */}
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                    <ServiceSection title="Traditional Burial">
                        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                            Community Funeral Homes will assist you with traditional burial services.
                        </p>
                    </ServiceSection>

                    <ServiceSection title="Cremation Services">
                        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                            Community Funeral Homes will assist you with cremation services.
                        </p>
                    </ServiceSection>
                    
                    <ServiceSection title="Memorial Planning" className="md:col-span-2">
                        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                            Community Funeral Homes will assist you with memorial planning services.
                        </p>
                    </ServiceSection>

                    <ServiceSection title="Funeral Home Contacts" className="md:col-span-2">
                        <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base">
                            {FUNERAL_CONTACTS.map((contact) => (
                                <ExternalLinkItem key={contact.name} name={contact.name} url={contact.url} />
                            ))}
                        </ul>
                    </ServiceSection>
                </div>
            </div>
        </div>
    );
}