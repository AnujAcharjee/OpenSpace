import type { Request, Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import type { ClientRequest, IncomingMessage } from 'http';

import { roundRobin } from './roundRobin.js';

type ServiceProxyOptions = {
  urls: string[];
  pathRewriteBase?: string;
  internalSecret?: string;
  ws?: boolean;
};

export function createServiceProxy({
  urls,
  // pathRewriteBase,
  internalSecret,
  ws,
}: ServiceProxyOptions) {
  const pickTarget = roundRobin(urls);

  return createProxyMiddleware({
    changeOrigin: true,
    ws: Boolean(ws),

    router: (req: Request) => {
      const target = pickTarget();
      console.log('[PROXY][ROUTER]', {
        url: req.originalUrl,
        target,
      });
      return target;
    },

    pathRewrite: (path: string, req: unknown) => {
      const r = req as any;
      const originalUrl = r.originalUrl || r.url || '';
      console.log('[PROXY][PATH_REWRITE]', {
        expressStripped: path,
        restored: originalUrl,
      });
      return originalUrl;
    },

    on: {
      proxyReq(proxyReq: ClientRequest, req: unknown) {
        const r = req as Request;

        console.log('[PROXY][OUTGOING_REQ]', {
          method: r.method,
          originalUrl: r.originalUrl,       
          target: proxyReq.getHeader('host'),
          headers: r.headers,
        });

        if (r.requestId) {
          proxyReq.setHeader('x-request-id', r.requestId);
        }

        if (internalSecret) {
          proxyReq.setHeader('x-gateway-secret', internalSecret);
        }

        if (r.user?.id) {
          proxyReq.setHeader('x-user-id', r.user.id);
        }
        if (r.user?.username) {
          proxyReq.setHeader('x-user-username', r.user.username);
        }
        if (r.user?.email) {
          proxyReq.setHeader('x-user-email', r.user.email);
        }

        // Restream body if parsed by upstream middleware
        if (r.body && Object.keys(r.body as object).length > 0) {
          fixRequestBody(proxyReq, r);
        }
      },

      proxyRes(proxyRes: IncomingMessage, req: unknown, res: unknown) {
        const r = req as Request;
        const response = res as Response;

        console.log('[PROXY][INCOMING_RES]', {
          method: r.method,
          url: r.originalUrl,
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers,
        });

        if (r.requestId) {
          response.setHeader('x-request-id', r.requestId);
        }
      },

      error(err: Error, req: unknown, res: unknown) {
        const r = req as Request;

        console.error('[PROXY][ERROR]', {
          url: r?.originalUrl,
          method: r?.method,
          error: err.message,
        });
      },
    },

    logLevel: 'debug',
  });
}
