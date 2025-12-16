import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from 'lucide-react';

export default function AdminBylaws() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Cemetery Bylaws</CardTitle>
                <CardDescription>View and manage the official bylaws and regulations.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-stone-50">
                    <FileText className="w-12 h-12 text-stone-300 mb-4" />
                    <h3 className="text-lg font-semibold text-stone-900 mb-1">Bylaws Repository</h3>
                    <p className="text-stone-500 mb-6 text-center max-w-md">
                        Upload and manage the cemetery's rules, regulations, and bylaws documents here.
                    </p>
                    <Button className="bg-teal-700 hover:bg-teal-800">
                        <Download className="w-4 h-4 mr-2" /> Upload New Bylaws
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}