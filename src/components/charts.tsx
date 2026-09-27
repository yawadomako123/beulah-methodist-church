type Datum = { label: string; value: number; display?: string };

/** Single-series vertical bar chart: one hue, rounded data-ends, hover tooltip, table view. */
export function ColumnChart({ data, caption, height = 180 }: { data: Datum[]; caption: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <div className="flex items-end gap-1.5" style={{ height }} role="img" aria-label={caption}>
        {data.map((d) => {
          const h = (d.value / max) * (height - 24);
          return (
            <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
              <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow group-hover:block">
                {d.label}: {d.display ?? d.value}
              </span>
              <div
                className="rounded-t-[4px] bg-brand-500 transition group-hover:bg-brand-700"
                style={{ height: Math.max(d.value > 0 ? 2 : 0, h) }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-slate-200 pt-1.5">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 truncate text-center text-[10px] text-slate-500">
            {data.length > 12 && i % 2 ? "" : d.label}
          </span>
        ))}
      </div>
      <DataTable data={data} caption={caption} />
    </figure>
  );
}

/** Horizontal bars for categorical breakdowns, direct-labelled with values. */
export function BarList({ data, caption }: { data: Datum[]; caption: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <figure>
      <ul className="space-y-2.5" aria-label={caption}>
        {data.map((d) => (
          <li key={d.label} title={`${d.label}: ${d.display ?? d.value}`}>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700">{d.label}</span>
              <span className="font-medium text-slate-900 tabular-nums">
                {d.display ?? d.value}
                {total > 0 && !d.display && <span className="ml-1.5 text-xs font-normal text-slate-500">{Math.round((d.value / total) * 100)}%</span>}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function DataTable({ data, caption }: { data: Datum[]; caption: string }) {
  return (
    <details className="no-print mt-3 text-xs">
      <summary className="cursor-pointer text-slate-500 hover:text-slate-700">View as table</summary>
      <table className="table mt-2">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td className="text-right tabular-nums">{d.display ?? d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
