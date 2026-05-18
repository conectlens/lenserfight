import { THEME_COOKIE_NAME, THEME_LS_KEY } from './themeConstants'

/**
 * Returns a self-contained IIFE string that resolves and applies the theme
 * class to <html> before any CSS or React renders, preventing FOUC.
 *
 * Resolution order:
 *   1. localStorage (explicit user choice)
 *   2. Cross-domain cookie lf_theme (unauthenticated cross-domain preference)
 *   3. prefers-color-scheme (OS/browser system preference)
 *
 * Intentionally built as a string so it can be injected as a blocking
 * <script> in <head> via the Vite plugin — it must not import any module.
 */
export function buildThemeInitScript(): string {
  return `(function(){try{` +
    `var s=localStorage.getItem('${THEME_LS_KEY}');` +
    `var r;` +
    `if(s==='dark'||s==='light'){r=s;}` +
    `else{` +
      `var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE_NAME}=([^;]+)/);` +
      `var c=m?m[1]:null;` +
      `if(c==='dark'||c==='light'){r=c;}` +
      `else{r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}` +
    `}` +
    `document.documentElement.classList.remove('light','dark');` +
    `document.documentElement.classList.add(r);` +
  `}catch(e){}})();`
}
