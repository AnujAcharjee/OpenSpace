import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCookieDomain,
  getCookieSameSite,
  getAuthCookieOptions,
  getClearAuthCookieOptions,
} from '../utils/cookie.js';

describe('Cookie utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getCookieDomain', () => {
    it('returns explicit domain with leading dot when COOKIE_DOMAIN is set', () => {
      process.env.COOKIE_DOMAIN = 'collab.anujacharjee.com';
      expect(getCookieDomain()).toBe('.collab.anujacharjee.com');

      process.env.COOKIE_DOMAIN = '.anujacharjee.com';
      expect(getCookieDomain()).toBe('.anujacharjee.com');
    });

    it('returns undefined for localhost COOKIE_DOMAIN', () => {
      process.env.COOKIE_DOMAIN = 'localhost';
      expect(getCookieDomain()).toBeUndefined();

      process.env.COOKIE_DOMAIN = '127.0.0.1';
      expect(getCookieDomain()).toBeUndefined();
    });

    it('infers domain from WEB_APP_URL when COOKIE_DOMAIN is not provided', () => {
      delete process.env.COOKIE_DOMAIN;
      process.env.WEB_APP_URL = 'https://collab.anujacharjee.com';
      expect(getCookieDomain()).toBe('.collab.anujacharjee.com');
    });

    it('returns undefined when WEB_APP_URL is localhost or an IP', () => {
      delete process.env.COOKIE_DOMAIN;
      process.env.WEB_APP_URL = 'http://localhost:3000';
      expect(getCookieDomain()).toBeUndefined();

      process.env.WEB_APP_URL = 'http://192.168.1.100:3000';
      expect(getCookieDomain()).toBeUndefined();
    });
  });

  describe('getCookieSameSite', () => {
    it('defaults to lax', () => {
      delete process.env.COOKIE_SAME_SITE;
      expect(getCookieSameSite()).toBe('lax');
    });

    it('respects valid COOKIE_SAME_SITE settings', () => {
      process.env.COOKIE_SAME_SITE = 'none';
      expect(getCookieSameSite()).toBe('none');

      process.env.COOKIE_SAME_SITE = 'strict';
      expect(getCookieSameSite()).toBe('strict');
    });
  });

  describe('getAuthCookieOptions', () => {
    it('builds valid cookie options for production', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_DOMAIN = 'collab.anujacharjee.com';
      const options = getAuthCookieOptions(3600);

      expect(options).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        domain: '.collab.anujacharjee.com',
        maxAge: 3600000,
      });
    });
  });

  describe('getClearAuthCookieOptions', () => {
    it('matches domain and path for clearing cookies', () => {
      process.env.COOKIE_DOMAIN = '.collab.anujacharjee.com';
      const options = getClearAuthCookieOptions();

      expect(options).toEqual({
        path: '/',
        domain: '.collab.anujacharjee.com',
      });
    });
  });
});
