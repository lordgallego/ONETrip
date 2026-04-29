import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Philippine Standard Time has no DST, so the offset is a constant +08:00.
 * Combine a yyyy-MM-dd date with an HH:mm time and tag it explicitly as
 * Manila local — otherwise Postgres will store the naive string as UTC and
 * the timeline will read it back shifted by 8 hours.
 */
export const PHT_OFFSET = "+08:00";

export function combineDateTimePHT(date: string, hhmm: string): string {
  return `${date}T${hhmm}:00${PHT_OFFSET}`;
}
