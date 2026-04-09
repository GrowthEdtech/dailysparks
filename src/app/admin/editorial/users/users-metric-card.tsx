type UsersMetricCardProps = {
  label: string;
  value: number | string;
  detail?: string;
  className?: string;
  minHeightClassName?: string;
  valueClassName?: string;
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function UsersMetricCard({
  label,
  value,
  detail,
  className,
  minHeightClassName = "min-h-[9.5rem]",
  valueClassName = "text-3xl",
}: UsersMetricCardProps) {
  return (
    <div
      className={joinClasses(
        "flex h-full flex-col justify-between rounded-[24px] border border-slate-200 px-4 py-4",
        minHeightClassName,
        className,
      )}
    >
      <p className="min-h-[3.25rem] text-xs font-semibold uppercase leading-5 tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <div className="mt-4 flex min-h-[4.25rem] flex-col justify-start">
        <p
          className={joinClasses(
            "font-bold leading-none tracking-tight tabular-nums text-[#0f172a]",
            valueClassName,
          )}
        >
          {value}
        </p>
        <div className="mt-2 min-h-[1.25rem]">
          {detail ? <p className="text-sm text-slate-500">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}
