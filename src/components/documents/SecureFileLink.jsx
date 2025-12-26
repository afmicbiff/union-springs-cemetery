import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Lock } from 'lucide-react';
import { toast } from "sonner";

export default function SecureFileLink({ doc }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async (e) => {
        e.preventDefault();
        
        // If it's a legacy public URL, just open it
        if (doc.url && !doc.file_uri) {
            window.open(doc.url, '_blank');
            return;
        }

        // If it's a private file, get a signed URL
        if (doc.file_uri) {
            setIsLoading(true);
            try {
                const res = await base44.functions.invoke('getSafeFileDownload', { file_uri: doc.file_uri });
                if (res.data?.signed_url) {
                    window.open(res.data.signed_url, '_blank', 'noopener');
                } else {
                    const msg = res.data?.error || 'Blocked by security policy';
                    toast.error(msg);
                }
            } catch (error) {
                console.error("Failed to sign URL:", error);
                toast.error("Failed to access secure file: " + error.message);
            } finally {
                setIsLoading(false);
            }
        } else {
            toast.error("File reference is missing.");
        }
    };

    return (
        <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 gap-2 text-stone-600 hover:text-teal-700"
            onClick={handleClick}
            disabled={isLoading}
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                doc.file_uri ? <Lock className="w-3 h-3 text-amber-600" /> : <ExternalLink className="w-3 h-3" />
            )}
            {isLoading ? "Accessing..." : "View"}
        </Button>
    );
}