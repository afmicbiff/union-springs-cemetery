import React, { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Filter, X } from 'lucide-react';

function SecurityFilters({ 
  severity, 
  setSeverity, 
  type, 
  setType, 
  start, 
  setStart, 
  end, 
  setEnd, 
  types = ['all'],
  onClear
}) {
  const hasFilters = severity !== 'all' || type !== 'all' || start || end;

  const handleClear = useCallback(() => {
    setSeverity('all');
    setType('all');
    setStart('');
    setEnd('');
    onClear?.();
  }, [setSeverity, setType, setStart, setEnd, onClear]);

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />
          <span className="text-xs sm:text-sm font-medium">Filters</span>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="ml-auto h-6 px-2 text-xs text-red-600">
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs text-stone-500">Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs text-stone-500">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs text-stone-500">Start Date</Label>
            <Input 
              type="date" 
              value={start} 
              onChange={(e) => setStart(e.target.value)} 
              className="h-7 sm:h-8 text-xs sm:text-sm bg-white"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs text-stone-500">End Date</Label>
            <Input 
              type="date" 
              value={end} 
              onChange={(e) => setEnd(e.target.value)} 
              className="h-7 sm:h-8 text-xs sm:text-sm bg-white"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(SecurityFilters);