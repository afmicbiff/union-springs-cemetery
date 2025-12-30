import React from "react";
import {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]; 

export default function ReportCharts({ type, data = [], predicted = [] }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-stone-500 p-4">No data for selected parameters.</div>;
  }

  if (type === "sales" || type === "predictive") {
    const merged = data.map((d, i) => ({ ...d, forecast: predicted[i]?.value }));
    return (
      <div className="bg-white border rounded-lg p-3">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" name="Actual" stroke="#0ea5e9" strokeWidth={2} dot={false} />
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
      <div className="bg-white border rounded-lg p-3">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === "deceased") {
    return (
      <div className="bg-white border rounded-lg p-3">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="bucket" outerRadius={110} label>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
}