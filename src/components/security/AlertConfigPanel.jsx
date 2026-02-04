import React, { memo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const DEFAULT_CONFIG = {
  enabled: true,
  failed_login_threshold: 5,
  window_minutes: 10,
  auto_block_enabled: false,
  auto_block_minutes: 60,
  notify_email: true,
  notify_in_app: true,
  severity_for_threshold: 'high'
};

function AlertConfigPanel() {
  const qc = useQueryClient();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);

  const { data: nsData, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const list = await base44.entities.NotificationSettings.list('-updated_date', 1);
      return list[0] || null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (nsData?.security_alerts) {
      setConfig(prev => ({ ...prev, ...nsData.security_alerts }));
    }
  }, [nsData]);

  const updateConfig = useCallback((key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveConfig = useCallback(async () => {
    setSaving(true);
    try {
      if (nsData?.id) {
        await base44.entities.NotificationSettings.update(nsData.id, { security_alerts: config });
      } else {
        await base44.entities.NotificationSettings.create({ security_alerts: config });
      }
      toast.success('Alert settings saved');
      qc.invalidateQueries({ queryKey: ['notification-settings'] });
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [config, nsData, qc]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />
          Alert Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        {/* Toggles Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
            <Checkbox 
              checked={config.enabled} 
              onCheckedChange={(v) => updateConfig('enabled', !!v)} 
            />
            Enable Alerts
          </label>
          <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
            <Checkbox 
              checked={config.notify_in_app} 
              onCheckedChange={(v) => updateConfig('notify_in_app', !!v)} 
            />
            In-App Notifications
          </label>
          <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
            <Checkbox 
              checked={config.notify_email} 
              onCheckedChange={(v) => updateConfig('notify_email', !!v)} 
            />
            Email Notifications
          </label>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs text-stone-500">Failed Logins Threshold</Label>
            <Input 
              type="number" 
              min={1} 
              value={config.failed_login_threshold} 
              onChange={(e) => updateConfig('failed_login_threshold', Number(e.target.value) || 5)} 
              className="h-7 sm:h-8 text-xs sm:text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs text-stone-500">Window (minutes)</Label>
            <Input 
              type="number" 
              min={1} 
              value={config.window_minutes} 
              onChange={(e) => updateConfig('window_minutes', Number(e.target.value) || 10)} 
              className="h-7 sm:h-8 text-xs sm:text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs text-stone-500">Severity</Label>
            <Select value={config.severity_for_threshold} onValueChange={(v) => updateConfig('severity_for_threshold', v)}>
              <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs text-stone-500">Auto-block (min)</Label>
            <Input 
              type="number" 
              min={1} 
              disabled={!config.auto_block_enabled} 
              value={config.auto_block_minutes} 
              onChange={(e) => updateConfig('auto_block_minutes', Number(e.target.value) || 60)} 
              className="h-7 sm:h-8 text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Auto-block toggle and Save */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
            <Checkbox 
              checked={config.auto_block_enabled} 
              onCheckedChange={(v) => updateConfig('auto_block_enabled', !!v)} 
            />
            Enable Auto-block when threshold is met
          </label>
          <Button onClick={saveConfig} disabled={saving} size="sm" className="h-7 sm:h-8 text-xs sm:text-sm gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(AlertConfigPanel);