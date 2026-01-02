import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SignaturePad from '@/components/common/SignaturePad';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SignDocumentDialog({ isOpen, onClose, document, memberId, onSigned }) {
  const [hasStroke, setHasStroke] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [sigRef, setSigRef] = useState(null);

  if (!document) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      const canvas = document.querySelector('#sig-pad canvas');
      if (!canvas) throw new Error('Signature pad not ready');
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('No signature');
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const upload = await base44.integrations.Core.UploadPrivateFile({ file });
      if (!upload.file_uri) throw new Error('Upload failed');

      // Fetch current member docs, update the target doc
      const memberArr = await base44.entities.Member.filter({ id: memberId }, null, 1);
      const member = (memberArr && memberArr[0]) || null;
      if (!member) throw new Error('Member not found');
      const docs = Array.isArray(member.documents) ? member.documents : [];
      const updated = docs.map(d => d.id === document.id ? {
        ...d,
        signature_file_uri: upload.file_uri,
        signed_at: new Date().toISOString(),
        signed_by_name: signerName || undefined
      } : d);
      await base44.entities.Member.update(memberId, { documents: updated });
      toast.success('Document signed');
      onSigned && onSigned();
      onClose && onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to sign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Sign: {document?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs">Signer Full Name</label>
            <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Type your full name" />
          </div>
          <div id="sig-pad">
            <SignaturePad onChange={setHasStroke} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!hasStroke || saving} className="bg-teal-700 hover:bg-teal-800">
            {saving ? 'Saving...' : 'Sign & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}