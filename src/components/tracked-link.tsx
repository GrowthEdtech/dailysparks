"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";

import {
  trackMarketingEvent,
  type MarketingEventProperties,
} from "../lib/marketing-analytics";

type TrackedLinkProps = PropsWithChildren<
  LinkProps &
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
      marketingEvent?: string;
      marketingProperties?: MarketingEventProperties;
    }
>;

export default function TrackedLink({
  children,
  marketingEvent,
  marketingProperties,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        if (marketingEvent) {
          trackMarketingEvent(marketingEvent, marketingProperties);
        }

        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
