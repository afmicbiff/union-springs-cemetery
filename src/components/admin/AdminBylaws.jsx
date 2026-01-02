import React, { useRef, useState, useEffect, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, Search as SearchIcon, ExternalLink } from 'lucide-react';

export default function AdminBylaws() {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const queryClient = useQueryClient();
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [signedUrl, setSignedUrl] = useState(null);
    const [textContent, setTextContent] = useState('');
    const [search, setSearch] = useState('');

    const { data: bylaws = [], isLoading: loadingBylaws } = useQuery({
        queryKey: ['bylaws'],
        queryFn: () => base44.entities.BylawDocument.list('-uploaded_at', 100),
        initialData: [],
    });

    useEffect(() => {
        if (selectedDoc || !bylaws.length) return;
        const lower = (s) => String(s || '').toLowerCase();
        const targetPdf = bylaws.find(d => lower(d.name).includes('union springs cemetery bylaws') && (lower(d.type) === 'pdf' || lower(d.name).endsWith('.pdf')));
        if (targetPdf) { setSelectedDoc(targetPdf); return; }
        const fallbackMgmt = bylaws.find(d => lower(d.name).includes('union springs cemetery management'));
        setSelectedDoc(fallbackMgmt || bylaws[0]);
    }, [bylaws, selectedDoc]);

    const currentExt = useMemo(() => (selectedDoc ? ((selectedDoc.type || selectedDoc.name?.split('.').pop() || '').toLowerCase()) : ''), [selectedDoc]);

    async function loadViewer(doc) {
        if (!doc) return;
        setSignedUrl(null);
        setTextContent('');
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
        setSignedUrl(signed_url);
        const ext = (doc.type || doc.name?.split('.').pop() || '').toLowerCase();
        if (["txt","md"].includes(ext)) {
            const res = await fetch(signed_url);
            const txt = await res.text();
            setTextContent(txt);
        }
    }

    useEffect(() => { if (selectedDoc) loadViewer(selectedDoc); }, [selectedDoc]);

    const highlightedText = useMemo(() => {
        if (!search) return textContent;
        try {
            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const parts = String(textContent).split(new RegExp(`(${safe})`, 'gi'));
            return parts.map((p, i) => (i % 2 ? <mark key={i} className="bg-yellow-200">{p}</mark> : p));
        } catch {
            return textContent;
        }
    }, [textContent, search]);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            const type = ["pdf","doc","docx","txt","md"].includes(ext) ? ext : 'other';
            await base44.entities.BylawDocument.create({ name: file.name, file_uri, uploaded_at: new Date().toISOString(), type });
            toast.success('Bylaws uploaded successfully');
            queryClient.invalidateQueries({ queryKey: ['bylaws'] });
        } catch (err) {
            toast.error(`Upload failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };
    return (
        <Card>
            <CardHeader>
                <CardTitle>Cemetery Bylaws</CardTitle>
                <CardDescription>View and manage the official bylaws and regulations.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-stone-400" />
                                <h3 className="text-sm font-semibold text-stone-800">Bylaws Repository</h3>
                            </div>
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt,.md"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                    {uploading ? 'Uploading…' : 'Upload'}
                                </Button>
                            </div>
                        </div>
                        <div className="border rounded-md overflow-hidden bg-stone-50">
                            {loadingBylaws ? (
                                <div className="p-4 text-sm text-stone-500">Loading…</div>
                            ) : bylaws.length === 0 ? (
                                <div className="p-4 text-sm text-stone-500">No bylaws uploaded yet.</div>
                            ) : (
                                <ul className="max-h-[520px] overflow-y-auto divide-y divide-stone-200">
                                    {bylaws.map((doc) => (
                                        <li key={doc.id} className={`p-3 cursor-pointer hover:bg-stone-100 ${selectedDoc?.id === doc.id ? 'bg-teal-50' : ''}`} onClick={() => setSelectedDoc(doc)}>
                                            <div className="text-sm font-medium text-stone-800 truncate">{doc.name}</div>
                                            <div className="text-xs text-stone-400">{new Date(doc.uploaded_at || doc.created_date || Date.now()).toLocaleString()}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <div className="flex items-center gap-2 mb-3">
                            <SearchIcon className="w-4 h-4 text-stone-400" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search within bylaws…" className="bg-stone-50" />
                            {signedUrl && (
                                <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="ml-auto">
                                    <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-2" /> Open</Button>
                                </a>
                            )}
                        </div>
                        <div className="border rounded-md bg-white h-[600px] overflow-auto">
                            {!selectedDoc ? (
                                <div className="h-full flex items-center justify-center text-stone-500">Select a document</div>
                            ) : (["txt","md"].includes(currentExt) ? (
                                <div className="p-4 whitespace-pre-wrap font-mono text-sm">{highlightedText}</div>
                            ) : currentExt === 'pdf' ? (
                                signedUrl ? <iframe src={signedUrl} title={selectedDoc.name} className="w-full h-full border-0" /> : <div className="h-full flex items-center justify-center text-stone-500">Preparing preview…</div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-stone-500 p-6 text-center">
                                    Preview not supported. Use the Open button to view this document in a new tab.
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 border rounded-md bg-stone-50 p-4">
                            <h3 className="text-sm font-semibold mb-2 text-stone-800">Cemetery Management System & Website Requirement Specification</h3>
                            <pre className="text-xs whitespace-pre-wrap leading-relaxed text-stone-700">{`Cemetery Management System & Website Requirement Specification
Cemetery Address: 1311 Fire Tower Rd, Shongaloo, LA 71072 Developer: Anthony Handy Hosting Provider: Ionos Systems
1. Website Development, Domain, Maintenance & Deliverables
The project requires the creation of a dedicated website that serves as both the public face for the cemetery and the administrative portal for management.
•	Prototypes & Turnover:
	o	Deliverables: The Developer must provide two (2) distinct prototypes of the website for review.
	o	Approval: The Client will select or refine a design from these options before the final website is constructed.
	o	Turnover: The project is considered complete only after the final website is fully operational and turned over to the user.
•	Domain & Hosting:
	o	Provider: Ionos Systems shall provide hosting and security services to ensure data integrity and site stability.
	o	Costs: The Client assumes responsibility for the purchase of the domain name and all associated hosting costs.
•	Maintenance & Updates:
	o	Rates: Ongoing maintenance and updates are billed at a rate of $60.00 per hour or $30.00 per 30-minute increment.
	o	Scope: Maintenance includes security patches, content updates, and functional repairs.
•	Administrative Access:
	o	The Administrator shall have restricted permissions focused solely on the ability to change, modify, or update information within the system.
2. Visual Design Specifications
The visual identity of the platform must adhere to the following strict style guide:
•	1. Primary Color: Teal
•	2. Secondary Color: Red
•	3. Background Color: Granite
•	4. Surface Color: Silver
•	5. Text Color (Main): Black
•	6. Status Colors: Standard
•	7. Heading Font: Antique Central
•	8. Body Font: Electra
•	9. Base Font Size: 16 pixels
•	10. Line Height: 1.5
•	11. Border Radius: Soft
•	12. Shadow Style: Subtle
•	13. Whitespace: Compact
•	14. Button Style: Bible (Thematic shape/style if possible)
•	15. Input Style: Single line entry Hover
•	16. Max Container Width: 1140px - 1240px
•	17. Animation Speed: Smooth
3. Mobile Accessibility & Software Architecture
The system must be fully responsive and optimized for mobile devices.
•	Mobile Functionality:
	o	Public View: Visitors must be able to navigate the map, search for graves, and view information seamlessly on smartphones.
	o	Admin View: Administrators require the ability to complete all management tasks (updating statuses, approving notifications, reviewing records) directly from a mobile interface.
•	Scalability:
	o	The architecture must allow for the future addition of new modules without requiring a complete rebuild of the core system.
•	Software Stack:
	o	To ensure compatibility with Ionos Systems and meet the scalability requirements, the suggested technology stack includes:
			Frontend: HTML5, CSS3, and JavaScript (React or Vue.js) for responsive, smooth animations.
			Backend: PHP (Laravel Framework) or Node.js for robust data handling.
			Database: MySQL or PostgreSQL for secure record storage.
4. Plot Management & Inventory
•	Terminology: The system shall use the term "Reserved" for all claims. The term "Sold" is prohibited as plots are assigned via donation.
•	Burial Capacity:
	o	Standard: One Casket.
	o	Cremation: The system must allow entry of up to three urns per single plot.
•	Administrative Notifications: An alert system is required to notify administrators of any updates or plot status changes needing review.
5. Digital Mapping
•	Color Coding: The digital map must utilize specific colors to denote status:
	o	Reserved
	o	Occupied
	o	Open
	o	Veteran
	o	More than one status
	o	Unavailable
•	Public Access: A dedicated public portal shall provide read-only access to the map.
•	Interactive Signage: The system must generate links or QR codes compatible with physical signage to aid on-site navigation.
•	Search Capabilities: Users must be able to search by name. The display shall include a map view alongside a list view of names.
6. Sales Processing & Record Keeping
•	Sales Details: Records must support individual line items and automatically trigger a status update to "Reserved" upon transaction completion.
•	Templates: The system shall generate templates for reservation receipts and confirmation letters.
•	Tracking: The database must include specific tracking for plots containing liners or vaults.
7. Reporting & Data Security
•	Reports: The system requires advanced reporting capabilities, specifically highlighting details related to perpetual care (lawn and site maintenance).
•	Data Archiving:
	o	The interface must provide clear instructions and functionality for saving and archiving data.
	o	The process for saving data to personal devices must be explicitly defined.
•	Security: Comprehensive security measures must be visible and active to ensure user confidence and data ease of use.
8. Client Responsibilities
•	Content & Assets: The Client retains sole responsibility for providing all necessary website content, including text, images, logos, and specific cemetery data required to populate the various sections of the website.
•	Timely Submission: The Client must submit all required materials in a timely manner to facilitate the development schedule.
9. Standard Development Provisions
•	Browser Compatibility: The website shall be tested and optimized for performance on all major modern web browsers (Chrome, Safari, Firefox, Edge).
•	Search Engine Optimization (SEO): The development includes basic on-page SEO setup, including meta tags, headers, and site map generation to ensure visibility.
•	Training & Documentation: The Developer shall provide a user manual or conduct a training session to ensure the Administrator can effectively operate the system.
•	Ownership: Upon completion and full payment, full ownership of the website code, design assets, and database transfers to the Client.`}</pre>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}