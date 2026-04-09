import type { ReactNode } from "react";

type UsersSectionHeaderProps = {
  eyebrow: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function UsersSectionHeader({
  eyebrow,
  description,
  aside,
  className,
}: UsersSectionHeaderProps) {
  return (
    <div
      className={joinClasses(
        "flex flex-col gap-3 md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="min-h-[6.5rem] max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          {eyebrow}
        </p>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>

      {aside ? (
        <div className="min-h-[6.5rem] shrink-0 text-right text-sm leading-6 text-slate-500">
          {aside}
        </div>
      ) : null}
    </div>
  );
}
