import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, Tags, RefreshCw, Download, Eye } from 'lucide-react';
import SecureFileLink from '@/components/documents/SecureFileLink';
import { format } from 'date-fns';

function useFlattenedDocuments() {
  return useQuery({
    queryKey: ['all-member-documents'],
    queryFn: async () => {
      const members = await base44.entities.Member.list('-updated_date', 1000);
      const out = [];
      for (const m of members || []) {
        const docs = Array.isArray(m.documents) ? m.documents : [];
        for (const d of docs) {
          out.push({
            key: `${m.id}:${d.id}`,
            doc_id: d.id,
            name: d.name,
            type: d.type,
            category: d.category || 'Other',
            uploaded_at: d.uploaded_at,
            expiration_date: d.expiration_date,
            member_id: m.id,
            member_name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
            member_email: m.email_primary,
            file_uri: d.file_uri,
            _doc: d
          });
        }
      }
      return out;
    },
    initialData: []
  });
}

export default function AdminDocumentsManager() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useFlattenedDocuments();

  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [expFilter, setExpFilter] = React.useState('all');
  const [sortKey, setSortKey] = React.useState('uploaded_at');
  const [sortDir, setSortDir] = React.useState('desc');
  const [selected, setSelected] = React.useState({}); // key -> true
  const [newCategory, setNewCategory] = React.useState('Legal');
  const [newExpDate, setNewExpDate] = React.useState('');

  const toggleAll = (checked, list) => {
    const m = {};
    if (checked) list.forEach(r => { m[r.key] = true; });
    setSelected(m);
  };

  const selectedList = React.useMemo(() => (rows || []).filter(r => selected[r.key]), [rows, selected]);

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
    onSuccess: () => {
      setSelected({});
      queryClient.invalidateQueries(['all-member-documents']);
    }
  });

  const filtered = React.useMemo(() => {
    const now = new Date();
    const term = search.trim().toLowerCase();
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
        return dir * ((new Date(va)).getTime() - (new Date(vb)).getTime());
      }
      return dir * String(va).localeCompare(String(vb));
    });
    return arr;
  }, [rows, search, typeFilter, expFilter, sortKey, sortDir]);

  return (
    <Card className="h-full border-stone-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-serif">Documents (Admin)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1">
            <Input placeholder="Search by member, email, doc name, type, category..." value={search} onChange={e => setSearch(e.target.value)} />
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
          <Button variant="outline" onClick={() => queryClient.invalidateQueries(['all-member-documents'])} className="gap-2"><RefreshCw className="w-4 h-4"/>Refresh</Button>
        </div>

        {Object.keys(selected).length > 0 && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 border rounded-md bg-stone-50">
            <div className="text-sm">{selectedList.length} selected</div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => bulkMutation.mutate({ mode: 'delete' })} className="gap-2"><Trash2 className="w-4 h-4"/>Delete</Button>
              <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <div className="flex gap-2 items-center">
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Legal">Legal</SelectItem>
                      <SelectItem value="Deed/Certificate">Deed/Certificate</SelectItem>
                      <SelectItem value="Identification">Identification</SelectItem>
                      <SelectItem value="Family Records">Family Records</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => bulkMutation.mutate({ mode: 'categorize' })} className="gap-2"><Tags className="w-4 h-4"/>Set Category</Button>
                </div>
                <div className="flex gap-2 items-center">
                  <Input type="date" value={newExpDate} onChange={(e) => setNewExpDate(e.target.value)} className="w-[180px]" />
                  <Button variant="outline" disabled={!newExpDate} onClick={() => bulkMutation.mutate({ mode: 'set_expiration' })}>Set Expiration</Button>
                  <Button variant="outline" onClick={() => bulkMutation.mutate({ mode: 'clear_expiration' })}>Clear Expiration</Button>
                </div>
              </div>
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
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={9} className="p-8 text-center text-stone-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-stone-500">No documents found.</td></tr>
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
                      <td className="p-3 whitespace-nowrap">{r.uploaded_at ? format(new Date(r.uploaded_at), 'MMM d, yyyy') : '—'}</td>
                      <td className="p-3 whitespace-nowrap">{r.expiration_date ? (
                        <span className={`px-1.5 py-0.5 rounded text-xs ${new Date(r.expiration_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}`}>
                          {format(new Date(r.expiration_date), 'MMM d, yyyy')}
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

function AuditTrailList() {
  const { data } = useQuery({
    queryKey: ['document-audit-log'],
    queryFn: () => base44.entities.DocumentAuditLog.list('-timestamp', 50),
    initialData: []
  });
  return (
    <div className="space-y-2 text-sm">
      {(data||[]).map((l) => (
        <div key={l.id} className="flex items-start justify-between border-b pb-2 last:border-0">
          <div>
            <div className="font-medium">{l.action === 'delete' ? 'Deleted' : 'Categorized'}</div>
            <div className="text-stone-600 text-xs">Doc {l.document_id} • Member {l.member_name} ({l.member_id})</div>
            {l.details && <div className="text-stone-500 text-xs">{l.details}</div>}
          </div>
          <div className="text-stone-400 text-xs">{l.timestamp ? format(new Date(l.timestamp), 'MMM d, h:mm a') : ''}</div>
        </div>
      ))}
    </div>
  );
}