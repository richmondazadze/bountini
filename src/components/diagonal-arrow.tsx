/** Decorative direction cue shared by internal actions and external links. */
export function DiagonalArrow() {
  return (
    <svg
      className="diagonal-arrow"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 18 18 6M6 6h12v12" />
    </svg>
  );
}
