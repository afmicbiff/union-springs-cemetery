import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, Database, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEOHead from '@/components/common/SEOHead';
import MetricGrid from '@/components/scale/MetricGrid';
import SectionCard from '@/components/scale/SectionCard';
import IssueCardList from '@/components/scale/IssueCardList';
import BulletList from '@/components/scale/BulletList';
import {
  scaleProjection,
  queryOptimizationSummary,
  cacheDesign,
  concurrencySafetyReview,
  issueCards,
  loadTestMetrics,
  deploymentChecklist,
  monitoringThresholds,
  implementationSummary,
} from '@/lib/scalePlan';

export default function ScaleReadiness() {
  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-6">
      <SEOHead title="Scale Readiness" description="Whole-site scale readiness report and implementation summary." />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-teal-700 mb-2">
              <Activity className="w-5 h-5" />
              <span className="text-sm font-medium">Whole-site scale hardening</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Scale Readiness</h1>
            <p className="text-sm text-stone-600 mt-1">Operational plan + implemented hardening for high concurrent usage.</p>
          </div>
          <Link to="/Admin">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Admin
            </Button>
          </Link>
        </div>

        <MetricGrid items={scaleProjection} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard title="1) Scale projection">
            <BulletList items={implementationSummary} />
          </SectionCard>

          <SectionCard title="2) Query optimization summary">
            <BulletList items={queryOptimizationSummary} />
          </SectionCard>

          <SectionCard title="3) Cache design">
            <div className="space-y-3">
              {cacheDesign.map((item) => (
                <div key={item.area} className="rounded-lg border border-stone-200 p-3 bg-stone-50 text-sm text-stone-700">
                  <div className="font-semibold text-stone-900">{item.area}</div>
                  <div>Strategy: {item.strategy}</div>
                  <div>TTL: {item.ttl}</div>
                  <div>Invalidation: {item.invalidation}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="4) Concurrency safety review">
            <BulletList items={concurrencySafetyReview} />
          </SectionCard>
        </div>

        <SectionCard title="5) Issue Cards">
          <IssueCardList items={issueCards} />
        </SectionCard>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard title="6) Load test metrics">
            <div className="space-y-3">
              {loadTestMetrics.map((item) => (
                <div key={item.metric} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 p-3 bg-stone-50 text-sm">
                  <span className="text-stone-700">{item.metric}</span>
                  <span className="font-semibold text-stone-900">{item.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="7) Deployment checklist">
            <BulletList items={deploymentChecklist} />
          </SectionCard>
        </div>

        <SectionCard title="8) Monitoring and alert thresholds">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {monitoringThresholds.map((item) => (
              <div key={item.name} className="rounded-lg border border-stone-200 p-4 bg-stone-50">
                <div className="flex items-center gap-2 text-stone-900 font-semibold mb-1">
                  {item.name.includes('cache') ? <Zap className="w-4 h-4 text-amber-600" /> : item.name.includes('error') ? <ShieldCheck className="w-4 h-4 text-red-600" /> : <Database className="w-4 h-4 text-teal-600" />}
                  {item.name}
                </div>
                <div className="text-sm text-stone-700">{item.threshold}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}