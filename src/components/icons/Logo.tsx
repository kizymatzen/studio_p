import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  // This is a placeholder. For a real SVG logo, replace the content below.
  // For simplicity, we'll use a styled text approach if an SVG is too complex here.
  // However, the request might imply a simple visual element.
  // Let's use a simple SVG icon that could represent "Little Steps".
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
      <path d="M2 17l10 5 10-5"></path>
      <path d="M2 12l10 5 10-5"></path>
    </svg>
  );
}
