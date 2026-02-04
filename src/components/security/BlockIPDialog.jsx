import React, { memo, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ShieldBan } from 'lucide-react';

function BlockIPDialog({ ip, open, onOpenChange }) {
  const qc = useQueryClient();
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!ip) return;
    setLoading(true);
    try {
      const duration = Math.max(1, Number(minutes) || 60);
      const res = await base44.functions.invoke('blockIp', { 
        ip_address: ip, 
        duration_minutes: duration, 
        reason: reason || '' 
      });
      if (res?.data?.error) throw new Error(res.data.error);
      toast.success(`Blocked ${ip} for ${duration} minutes`);
      onOpenChange(false);
      setMinutes(60);
      setReason('');
      qc.invalidateQueries({ queryKey: ['blocked-ips'] });
      qc.invalidateQueries({ queryKey: ['blocked-all'] });
    } catch (e) {
      toast.error(e?.message || 'Block failed');
    } finally {
      setLoading(false);
    }
  }, [ip, minutes, reason, qc, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setMinutes(60);
    setReason('');
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
            <ShieldBan className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            Block IP: <span className="font-mono">{ip}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs text-stone-500">Duration (minutes)</Label>
            <Input 
              type="number" 
              min={1} 
              value={minutes} 
              onChange={(e) => setMinutes(e.target.value)} 
              className="h-8 sm:h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs text-stone-500">Reason (optional)</Label>
            <Input 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="e.g., Suspicious activity"
              className="h-8 sm:h-9 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="h-8 sm:h-9 text-xs sm:text-sm">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="h-8 sm:h-9 text-xs sm:text-sm gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldBan className="w-3.5 h-3.5" />}
              Block
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default memo(BlockIPDialog);