import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
export const assetUrl = (p) => (!p || /^https?:\/\//.test(p) ? p : `${import.meta.env.VITE_API_URL}${p}`);
