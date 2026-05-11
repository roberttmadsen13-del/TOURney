// Ambient declarations for window globals set by lib/*.js and inline scripts.
interface Window {
  tourneyUtil: {
    esc: (s: unknown) => string;
    escAttr: (s: unknown) => string;
    fmtDate: (input: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
    fmtPhone: (raw: string) => string;
    copyToClipboard: (text: string) => Promise<boolean>;
    haptic: (pattern?: number | number[]) => void;
    debounce: <F extends (...args: any[]) => any>(fn: F, delay: number) => (...args: Parameters<F>) => void;
    throttle: <F extends (...args: any[]) => any>(fn: F, interval: number) => (...args: Parameters<F>) => void;
    toast: (text: string, opts?: { kind?: 'info'|'ok'|'err'|'warn'; ms?: number; action?: { label: string; onClick: () => void } }) => void;
  };
  esc: (s: unknown) => string;
  fmtDate: (input: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
  showToast: (msg: string) => void;
  celebrate: { show: (opts: Record<string, unknown>) => void; hide: () => void };
  GOLF_COURSES_DB: unknown[];
  tourneyEmpty: unknown;
  SENTRY_DSN: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Sentry: any;
  TOURNEY_RELEASE: string | undefined;
  _tourneyOnlinePrev: boolean | undefined;
  webkitAudioContext: typeof AudioContext | undefined;
  tourney: {
    db: unknown;
    ready: Promise<{ tournament: Record<string, unknown>; player: Record<string, unknown> }>;
    [key: string]: unknown;
  };
  supabase: unknown;
  _navInjectLink: boolean | undefined;
  _navPlatformInject: boolean | undefined;
}
