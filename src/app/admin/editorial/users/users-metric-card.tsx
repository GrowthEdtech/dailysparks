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
      <p className="text-xs font-semibold uppercase leading-5 tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <div className="mt-4">
        <p
          className={joinClasses(
            "font-bold tracking-tight tabular-nums text-[#0f172a]",
            valueClassName,
          )}
        >
          {value}
        </p>
        {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
      </div>
    </div>
  );
}
