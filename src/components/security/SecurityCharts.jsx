import React, { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SEV_COLORS = { 
  info: '#94a3b8', 
  low: '#10b981', 
  medium: '#f59e0b', 
  high: '#f97316', 
  critical: '#ef4444' 
};

const SeverityPieChart = memo(function SeverityPieChart({ events = [] }) {
  const data = useMemo(() => {
    const map = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
    events.forEach(e => {
      if (map[e.severity] !== undefined) map[e.severity]++;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [events]);

  return (
    <Card className="h-52 sm:h-56 lg:h-64">
      <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
        <CardTitle className="text-[10px] sm:text-xs lg:text-sm">Severity Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-36 sm:h-40 lg:h-48 px-2 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius="70%" innerRadius="30%">
              {data.map((entry, i) => (
                <Cell key={`sev-${i}`} fill={SEV_COLORS[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} events`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

const EventTypeBarChart = memo(function EventTypeBarChart({ events = [] }) {
  const data = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const k = e.event_type || 'other';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [events]);

  return (
    <Card className="h-52 sm:h-56 lg:h-64">
      <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
        <CardTitle className="text-[10px] sm:text-xs lg:text-sm">Top Event Types</CardTitle>
      </CardHeader>
      <CardContent className="h-36 sm:h-40 lg:h-48 px-2 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={70} />
            <Tooltip formatter={(value, name, props) => [`${value} events`, props.payload.fullName]} />
            <Bar dataKey="value" fill="#60a5fa" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

const TopIPsBarChart = memo(function TopIPsBarChart({ events = [] }) {
  const data = useMemo(() => {
    const map = {};
    events.forEach(e => {
      if (e.ip_address) map[e.ip_address] = (map[e.ip_address] || 0) + 1;
    });
    return Object.entries(map)
      .map(([ip, count]) => ({ ip: ip.length > 15 ? ip.slice(0, 15) + '…' : ip, count, fullIp: ip }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [events]);

  return (
    <Card className="h-52 sm:h-56 lg:h-64">
      <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
        <CardTitle className="text-[10px] sm:text-xs lg:text-sm">Top IPs</CardTitle>
      </CardHeader>
      <CardContent className="h-36 sm:h-40 lg:h-48 px-2 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="ip" tick={{ fontSize: 9 }} width={85} />
            <Tooltip formatter={(value, name, props) => [`${value} events`, props.payload.fullIp]} />
            <Bar dataKey="count" fill="#34d399" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

function SecurityCharts({ events = [] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
      <SeverityPieChart events={events} />
      <EventTypeBarChart events={events} />
      <TopIPsBarChart events={events} />
    </div>
  );
}

export default memo(SecurityCharts);