import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), `${message}: ${needle}`);
}

const dashboardJs = read('public/js/dashboard.js');
const stylesCss = read('public/styles.css');
const edgeStats = read('supabase/functions/get-business-scan-statistics/index.ts');
const serverIndex = read('server/index.js');

[
  'CHART_VIEW_OPTIONS',
  'CHART_VIEW_LABELS',
  'ChartViewSwitcher',
  'StatisticsChart',
  'visitor_stats_chart_view_',
  'data-chart-view-select',
  'Diese Ansicht ist für diese Daten nicht verfügbar.',
  'Für den gewählten Zeitraum sind noch keine Scans vorhanden.',
  'weekday_hour_heatmap',
  'last_scans',
  'Werte kopieren'
].forEach((needle) => assertIncludes(dashboardJs, needle, 'Dashboard muss flexible Statistik-Views enthalten'));

[
  "gender_distribution: {\n    default: 'donut'",
  "allowed: ['bar', 'pie', 'donut', 'table']",
  "scans_over_time: {\n    default: 'line'",
  "allowed: ['line', 'bar', 'table']",
  "gender_age_matrix: {\n    default: 'grouped_bar'",
  "allowed: ['grouped_bar', 'stacked_bar', 'table']",
  "weekday_hour_heatmap: {\n    default: 'heatmap'",
  "last_scans: {\n    default: 'table',\n    allowed: ['table']"
].forEach((needle) => assertIncludes(dashboardJs, needle, 'Chart-Optionen müssen fachlich begrenzt sein'));

const scansOverTimeBlock = dashboardJs.match(/scans_over_time:\s*\{[\s\S]*?\n  \}/)?.[0] || '';

assert(scansOverTimeBlock.includes("allowed: ['line', 'bar', 'table']"), 'Zeitverlauf darf nur Linie, Balken und Tabelle anbieten.');
assert(!scansOverTimeBlock.includes('pie') && !scansOverTimeBlock.includes('donut'), 'Zeitverlauf darf keine Kuchen- oder Donutansicht anbieten.');

[
  'chart-card-header',
  'pie-chart',
  'line-chart',
  'grouped-chart',
  'stacked-chart',
  'heatmap-grid',
  'stats-table-wrap',
  '@media (max-width: 860px)'
].forEach((needle) => assertIncludes(stylesCss, needle, 'Styles müssen neue responsive Chart-Typen abdecken'));

[
  'function weekdayHourHeatmap',
  'weekday_hour_heatmap: weekdayHourHeatmap(rows, weekdayLabels)',
  'hour_label'
].forEach((needle) => {
  assertIncludes(edgeStats, needle, 'Edge Function muss Heatmap-Daten liefern');
  assertIncludes(serverIndex, needle, 'Lokaler Fallback muss Heatmap-Daten liefern');
});

console.log('Flexible Besucherstatistik-Chart-Views sind statisch abgesichert.');
