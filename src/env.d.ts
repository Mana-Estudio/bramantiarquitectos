interface ImportMetaEnv {
  /** Token público de Cloudflare Web Analytics (sin cookies). Si falta, no se carga. */
  readonly PUBLIC_CF_ANALYTICS_TOKEN?: string;
  /** Site key pública de Cloudflare Turnstile. Por defecto, la clave de prueba que siempre valida. */
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
