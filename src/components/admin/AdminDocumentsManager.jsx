import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, Tags, RefreshCw, Loader2, Search } from 'lucide-react';
import SecureFileLink from '@/components/documents/SecureFileLink';
import { format, parseISO, isValid } from 'date-fns';
import { toast } from 'sonner';

// Safe date formatting helper
function safeFormatDate(dateStr, formatStr = 'MMM d, yyyy') {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, formatStr) : '—';
  } catch { return '—'; }
}

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function useFlattenedDocuments() {
  return useQuery({
    queryKey: ['all-member-documents'],
    queryFn: async () => {
      const members = await base44.entities.Member.list('-updated_date', 500);
      const out = [];
      for (const m of members || []) {
        const docs = Array.isArray(m.documents) ? m.documents : [];
        for (const d of docs) {
          out.push({
            key: `${m.id}:${d.id}`,
            doc_id: d.id,
            name: d.name || 'Untitled',
            type: d.type || 'Other',
            category: d.category || 'Other',
            uploaded_at: d.uploaded_at,
            expiration_date: d.expiration_date,
            member_id: m.id,
            member_name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unknown',
            member_email: m.email_primary || '',
            file_uri: d.file_uri,
            _doc: d
          });
        }
      }
      return out;
    },
    initialData: [],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

function AdminDocumentsManager() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading, isError, refetch } = useFlattenedDocuments();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expFilter, setExpFilter] = useState('all');
  const [sortKey, setSortKey] = useState('uploaded_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState({});
  const [newCategory, setNewCategory] = useState('Legal');
  const [newExpDate, setNewExpDate] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const toggleAll = useCallback((checked, list) => {
    const m = {};
    if (checked) list.forEach(r => { m[r.key] = true; });
    setSelected(m);
  }, []);

  const selectedList = useMemo(() => (rows || []).filter(r => selected[r.key]), [rows, selected]);

  const bulkMutation = useMutation({
    mutationFn: async ({ mode }) => {
      const docs = selectedList.map(r => ({ member_id: r.member_id, doc_id: r.doc_id }));
      let payload;
      if (mode === 'delete') payload = { action: 'bulk_delete', documents: docs };
      else if (mode === 'categorize') payload = { action: 'bulk_categorize', documents: docs, new_category: newCategory };
      else if (mode === 'set_expiration') payload = { action: 'bulk_set_expiration', documents: docs, new_expiration: newExpDate };
      else if (mode === 'clear_expiration') payload = { action: 'bulk_clear_expiration', documents: docs };
      const res = await base44.functions.invoke('manageDocuments', payload);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      setSelected({});
      queryClient.invalidateQueries(['all-member-documents']);
      toast.success(`Successfully processed ${data?.processed || selectedList.length} documents`);
    },
    onError: (err) => toast.error('Bulk action failed: ' + err.message)
  });

  const filtered = useMemo(() => {
    const now = new Date();
    const term = (debouncedSearch || '').trim().toLowerCase();
    let arr = rows || [];
    if (term) {
      arr = arr.filter(r => (
        (r.name || '').toLowerCase().includes(term) ||
        (r.member_name || '').toLowerCase().includes(term) ||
        (r.member_email || '').toLowerCase().includes(term) ||
        (r.type || '').toLowerCase().includes(term) ||
        (r.category || '').toLowerCase().includes(term)
      ));
    }
    if (typeFilter !== 'all') arr = arr.filter(r => (r.type || '') === typeFilter);
    if (expFilter !== 'all') {
      if (expFilter === 'expired') arr = arr.filter(r => r.expiration_date && new Date(r.expiration_date) < now);
      if (expFilter === 'noexp') arr = arr.filter(r => !r.expiration_date);
    }
    arr = [...arr].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const va = a[sortKey] || '';
      const vb = b[sortKey] || '';
      if (sortKey === 'uploaded_at' || sortKey === 'expiration_date') {
        const dateA = va ? new Date(va).getTime() : 0;
        const dateB = vb ? new Date(vb).getTime() : 0;
        return dir * (dateA - dateB);
      }
      return dir * String(va).localeCompare(String(vb));
    });
    return arr;
  }, [rows, debouncedSearch, typeFilter, expFilter, sortKey, sortDir]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries(['all-member-documents']);
  }, [queryClient]);

  return (
    <Card className="h-full border-stone-200 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <CardTitle className="text-xl font-serif">Documents (Admin)</CardTitle>
        <Badge variant="outline" className="text-xs">{filtered.length} of {rows?.length || 0}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input 
              placeholder="Search by member, email, doc name, type, category..." 
              value={search} 
              onChange={e => setSearch(e.target.value.slice(0, 100))} 
              className="pl-9 h-10"
              maxLength={100}
            />
          </div>
          <div className="w-[180px]">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Will">Will</SelectItem>
                <SelectItem value="Deed/Certificate">Deed/Certificate</SelectItem>
                <SelectItem value="Identification">Identification</SelectItem>
                <SelectItem value="Family Records">Family Records</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px]">
            <Select value={expFilter} onValueChange={setExpFilter}>
              <SelectTrigger><SelectValue placeholder="Expiration" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="expired">Expired Only</SelectItem>
                <SelectItem value="noexp">No Expiration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px]">
            <Select value={`${sortKey}:${sortDir}`} onValueChange={(v) => { const [k,d]=v.split(':'); setSortKey(k); setSortDir(d); }}>
              <SelectTrigger><SelectValue placeholder="Sort By" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="uploaded_at:desc">Newest Upload</SelectItem>
                <SelectItem value="uploaded_at:asc">Oldest Upload</SelectItem>
                <SelectItem value="member_name:asc">Member A→Z</SelectItem>
                <SelectItem value="member_name:desc">Member Z→A</SelectItem>
                <SelectItem value="expiration_date:asc">Exp Soonest</SelectItem>
                <SelectItem value="expiration_date:desc">Exp Latest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="gap-2 h-10">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {Object.keys(selected).length > 0 && (
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3 border rounded-md bg-teal-50 border-teal-200 animate-in fade-in">
            <div className="text-sm font-medium text-teal-800">{selectedList.length} selected</div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => bulkMutation.mutate({ mode: 'delete' })} 
                disabled={bulkMutation.isPending}
                className="gap-2 h-9"
              >
                {bulkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                Delete
              </Button>
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Category"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Deed/Certificate">Deed/Certificate</SelectItem>
                    <SelectItem value="Identification">Identification</SelectItem>
                    <SelectItem value="Family Records">Family Records</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => bulkMutation.mutate({ mode: 'categorize' })} disabled={bulkMutation.isPending} className="gap-2 h-9">
                  <Tags className="w-4 h-4"/>Set
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Input type="date" value={newExpDate} onChange={(e) => setNewExpDate(e.target.value)} className="w-[150px] h-9" />
                <Button size="sm" variant="outline" disabled={!newExpDate || bulkMutation.isPending} onClick={() => bulkMutation.mutate({ mode: 'set_expiration' })} className="h-9">Set Exp</Button>
                <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ mode: 'clear_expiration' })} disabled={bulkMutation.isPending} className="h-9">Clear Exp</Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelected({})} className="h-9 text-teal-700">Clear</Button>
            </div>
          </div>
        )}

        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-stone-100 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-[40px]">
                    <Checkbox checked={filtered.length>0 && selectedList.length===filtered.length} onCheckedChange={(c)=>toggleAll(c, filtered)} />
                  </th>
                  <th className="p-3">Member</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Document</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Uploaded</th>
                  <th className="p-3">Expiration</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {isError ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center">
                      <div className="text-red-500 mb-2">Error loading documents</div>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>Try Again</Button>
                    </td>
                  </tr>
                ) : isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-stone-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading documents...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-stone-500 italic">No documents found.</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.key} className={selected[r.key] ? 'bg-teal-50/50' : ''}>
                      <td className="p-3">
                        <Checkbox checked={!!selected[r.key]} onCheckedChange={(c)=>setSelected(prev=>({ ...prev, [r.key]: !!c }))} />
                      </td>
                      <td className="p-3 whitespace-nowrap">{r.member_name}</td>
                      <td className="p-3 whitespace-nowrap text-stone-600">{r.member_email}</td>
                      <td className="p-3 truncate max-w-[260px]" title={r.name}><div className="flex items-center gap-2"><FileText className="w-4 h-4"/>{r.name}</div></td>
                      <td className="p-3">{r.type}</td>
                      <td className="p-3"><Badge variant="outline">{r.category}</Badge></td>
                      <td className="p-3 whitespace-nowrap text-xs">{safeFormatDate(r.uploaded_at)}</td>
                      <td className="p-3 whitespace-nowrap">{r.expiration_date ? (
                        <span className={`px-1.5 py-0.5 rounded text-xs ${new Date(r.expiration_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}`}>
                          {safeFormatDate(r.expiration_date)}
                        </span>
                      ) : '—'}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <SecureFileLink doc={{ file_uri: r.file_uri, name: r.name }} />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => {
                            setSelected({ [r.key]: true });
                            bulkMutation.mutate({ mode: 'delete' });
                          }} title="Delete">
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Recent Document Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditTrailList />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

const AuditTrailList = React.memo(function AuditTrailList() {
  const { data, isLoading } = useQuery({
    queryKey: ['document-audit-log'],
    queryFn: () => base44.entities.DocumentAuditLog.list('-timestamp', 30),
    initialData: [],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-center text-stone-500 py-4 text-sm italic">No audit activity recorded yet.</div>;
  }

  return (
    <div className="space-y-2 text-sm max-h-[300px] overflow-y-auto">
      {data.map((l) => (
        <div key={l.id} className="flex items-start justify-between border-b pb-2 last:border-0">
          <div>
            <div className="font-medium">{l.action === 'delete' ? 'Deleted' : l.action === 'categorize' ? 'Categorized' : l.action}</div>
            <div className="text-stone-600 text-xs">Doc {l.document_id} • {l.member_name || 'Unknown'}</div>
            {l.details && <div className="text-stone-500 text-xs truncate max-w-[300px]">{l.details}</div>}
          </div>
          <div className="text-stone-400 text-xs whitespace-nowrap">{safeFormatDate(l.timestamp, 'MMM d, h:mm a')}</div>
        </div>
      ))}
    </div>
  );
});

export default React.memo(AdminDocumentsManager);