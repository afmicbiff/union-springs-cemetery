import React, { memo, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]; 

const ReportCharts = memo(function ReportCharts({ type, data = [], predicted = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-stone-500 p-4 text-center border-2 border-dashed rounded-lg">
        No data for selected parameters.
      </div>
    );
  }

  // Memoize merged data for sales/predictive
  const mergedData = useMemo(() => {
    if (type !== 'sales' && type !== 'predictive') return data;
    return data.map((d, i) => ({ ...d, forecast: predicted[i]?.value }));
  }, [type, data, predicted]);

  if (type === "sales" || type === "predictive") {
    return (
      <div className="bg-white border rounded-lg p-2 sm:p-3">
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={50} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" name="Actual" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              {type === "predictive" && (
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeDasharray="5 4" dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === "plot") {
    return (
      <div className="bg-white border rounded-lg p-2 sm:p-3">
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="count" name="Count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === "deceased") {
    return (
      <div className="bg-white border rounded-lg p-2 sm:p-3">
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="bucket" outerRadius={80} innerRadius={30} label={({ bucket, percent }) => `${bucket} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
});

export default ReportCharts;