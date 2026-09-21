import type { CookieOptions } from 'express';

export function getCookieDomain(): string | undefined {
  const explicitDomain = process.env.COOKIE_DOMAIN?.trim();
  if (explicitDomain) {
    if (explicitDomain === 'localhost' || explicitDomain === '127.0.0.1') {
      return undefined;
    }
    return explicitDomain.startsWith('.') ? explicitDomain : `.${explicitDomain}`;
  }

  const webAppUrl = process.env.WEB_APP_URL?.trim();
  if (webAppUrl) {
    try {
      const hostname = new URL(webAppUrl).hostname;
      if (hostname && hostname !== 'localhost' && !/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        return hostname.startsWith('.') ? hostname : `.${hostname}`;
      }
    } catch {
      // Ignore URL parse errors
    }
  }

  return undefined;
}

export function getCookieSameSite(): 'lax' | 'none' | 'strict' {
  const sameSite = process.env.COOKIE_SAME_SITE?.trim().toLowerCase();
  if (sameSite === 'none' || sameSite === 'lax' || sameSite === 'strict') {
    return sameSite;
  }
  return 'lax';
}

export function getAuthCookieOptions(maxAgeSeconds?: number): CookieOptions {
  const domain = getCookieDomain();
  const sameSite = getCookieSameSite();
  const isProduction = process.env.NODE_ENV === 'production';

  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction || sameSite === 'none',
    sameSite,
    path: '/',
  };

  if (domain) {
    options.domain = domain;
  }

  if (typeof maxAgeSeconds === 'number') {
    options.maxAge = maxAgeSeconds * 1000;
  }

  return options;
}

export function getClearAuthCookieOptions(): CookieOptions {
  const domain = getCookieDomain();
  const options: CookieOptions = {
    path: '/',
  };

  if (domain) {
    options.domain = domain;
  }

  return options;
}
