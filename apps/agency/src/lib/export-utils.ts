import { format } from 'date-fns';

const BOM = '\uFEFF';

type CsvScalar = string | number | boolean | null | undefined;

type TopTripCsvRow = {
  title: string;
  bookings: number;
  revenue: number;
  avgRating: number;
  reviewCount: number;
};

function escapeField(value: CsvScalar) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportRevenueTrendsToCSV(data: Array<{ date: string; amount: number }>, filename = 'revenue-trends.csv') {
  const headers = ['Date', 'Amount'];
  const rows = data.map((d) => [format(new Date(d.date), 'yyyy-MM-dd'), d.amount]);
  const body = [headers.join(','), ...rows.map(r => r.map(escapeField).join(','))].join('\n');
  downloadCSV(body, filename);
}

export function exportTopTripsToCSV(data: TopTripCsvRow[], filename = 'top-trips.csv') {
  const headers = ['Rank', 'Trip Title', 'Bookings', 'Revenue', 'AvgRating', 'Reviews'];
  const rows = data.map((t, idx) => [idx + 1, t.title, t.bookings, t.revenue, t.avgRating, t.reviewCount]);
  const body = [headers.join(','), ...rows.map(r => r.map(escapeField).join(','))].join('\n');
  downloadCSV(body, filename);
}

export function exportConversionFunnelToCSV(data: Array<{ stage: string; count: number }>, filename = 'conversion-funnel.csv') {
  const headers = ['Stage', 'Count'];
  const rows = data.map((d) => [d.stage, d.count]);
  const body = [headers.join(','), ...rows.map(r => r.map(escapeField).join(','))].join('\n');
  downloadCSV(body, filename);
}
