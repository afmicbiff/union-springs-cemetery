import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import MemberProfileDetail from './MemberProfileDetail';

export default function MemberProfileDialog({ member, isOpen, onClose, onEdit }) {
    if (!member) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 w-[95vw]">
                <MemberProfileDetail 
                    member={member} 
                    onClose={onClose} 
                    onEdit={onEdit} 
                    isDialog={true}
                />
            </DialogContent>
        </Dialog>
    );
}