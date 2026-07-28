import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, ComposedChart
} from 'recharts';
import { Card } from '../../components/Card';
import type { MetricsResponse } from '../../types/metrics';
import { formatDateString } from '../../utils/formatDate';
import './MetricsCharts.css';

interface MetricsChartsProps {
  metrics: MetricsResponse;
}

const COLORS = ['#16A34A', '#3B82F6', '#F59E0B', '#DC2626', '#8B5CF6', '#EC4899'];

/**
 * Renders interactive charts for metrics visualization.
 * 
 * Data Transformation Strategy:
 * The backend API is designed to return data structures that are already optimized for Recharts.
 * For example, time-series data is returned as an array of objects `{ date, count }`, which maps
 * directly to the `<AreaChart data={...}>` without needing frontend-side grouping or reduction.
 */
export function MetricsCharts({ metrics }: MetricsChartsProps) {
  const { t } = useTranslation();

  interface TooltipPayloadEntry {
    color?: string;
    name?: string;
    value?: string | number;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
  }

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="metrics-chart-tooltip">
          <p className="metrics-chart-tooltip__label">{formatDateString(label ?? '')}</p>
          {payload.map((entry: TooltipPayloadEntry, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="metrics-charts">
      {/* TIME SERIES */}
      <div className="metrics-charts__row">
        <Card title={t('metrics.charts.inferencesTime')} className="metrics-charts__card">
          <div className="metrics-charts__chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.timeSeries.inferencesOverTime}>
                <defs>
                  <linearGradient id="colorInferences" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" tickFormatter={formatDateString} tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" name={t('metrics.summary.totalInferences')} dataKey="count" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorInferences)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={t('metrics.charts.defectsTime')} className="metrics-charts__card">
          <div className="metrics-charts__chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.timeSeries.defectsOverTime}>
                <defs>
                  <linearGradient id="colorDefects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" tickFormatter={formatDateString} tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" name={t('metrics.summary.totalDefects')} dataKey="count" stroke="#DC2626" strokeWidth={2} fillOpacity={1} fill="url(#colorDefects)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* DISTRIBUTION & MODELS */}
      <div className="metrics-charts__row">
        <Card title={t('metrics.charts.defectDistribution')} className="metrics-charts__card">
          <div className="metrics-charts__chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.defectDistribution}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  paddingAngle={5}
                >
                  {metrics.defectDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={t('metrics.charts.modelUsage')} className="metrics-charts__card">
          <div className="metrics-charts__chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.modelUsage} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                <YAxis dataKey="modelName" type="category" width={100} tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="totalInferences" name={t('metrics.summary.totalInferences')} fill="#16A34A" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* CONFIDENCE & REPORTS */}
      <div className="metrics-charts__row">
        <Card title={t('metrics.charts.confidenceByType')} className="metrics-charts__card">
          <div className="metrics-charts__chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={metrics.confidenceByDefectType} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="type" tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} domain={[0, 1]} tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                <RechartsTooltip formatter={(val: any) => `${(Number(val) * 100).toFixed(1)}%`} />
                
                {/* Min to Max Range */}
                <Bar 
                  dataKey="maxConfidence" 
                  name={t('metrics.charts.maxConfidence')}
                  fill="#14B8A6" 
                  barSize={40} 
                  radius={[4, 4, 0, 0]}
                />
                {/* Average */}
                <Bar 
                  dataKey="avgConfidence" 
                  name={t('metrics.charts.avgConfidence')}
                  fill="#0F766E" 
                  barSize={40} 
                  radius={[4, 4, 0, 0]}
                  style={{ transform: 'translateX(-40px)' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={t('metrics.charts.reportsByType')} className="metrics-charts__card">
          <div className="metrics-charts__chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.reports.byType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="type" tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name={t('nav.reports')} fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

    </div>
  );
}
