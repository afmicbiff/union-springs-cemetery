import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from 'lucide-react';
import SecurityMonitor from './SecurityMonitor';

export default function AdminSecurity() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-teal-600"/> Data Security & Archiving
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="prose text-stone-700 space-y-8 max-w-none">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-lg mb-2 text-stone-900">Data Storage</h4>
                            <p className="leading-relaxed">
                                All cemetery records are securely stored in the cloud database. This ensures redundancy and access from any authorized device.
                            </p>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-lg mb-2 text-stone-900">Backups</h4>
                            <p className="leading-relaxed">
                                It is recommended to perform a manual export (using the "Backup Data" button in the dashboard header) once a month. Save this JSON file to a secure external hard drive or a dedicated organizational cloud storage.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold text-lg mb-2 text-stone-900">Restoration</h4>
                            <p className="leading-relaxed">
                                In the event of data loss, the exported JSON file can be used by the technical team to restore the database to its previous state.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold text-lg mb-2 text-stone-900">Access Control</h4>
                            <p className="leading-relaxed">
                                Only authorized administrators should have access to this dashboard. Regularly review who has access credentials.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-sm border-l-4 border-yellow-400">
                    <strong>Security Tip:</strong> When downloading reports containing personal information (names, donations), 
                    ensure they are stored in encrypted folders on your personal device.
                </div>

                <SecurityMonitor />
            </CardContent>
        </Card>
    );
}