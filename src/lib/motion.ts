export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isNarrow = () => typeof innerWidth !== 'undefined' && innerWidth < 820;
