import type { Request, Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import type { ClientRequest, IncomingMessage } from 'http';

import { roundRobin } from './roundRobin.js';
import { logger } from '../lib/logger.js';

type ServiceProxyOptions = {
  urls: string[];
  pathRewriteBase?: string;
  internalSecret?: string;
  ws?: boolean;
};

export function createServiceProxy({
  urls,
  internalSecret,
  ws,
}: ServiceProxyOptions) {
  const pickTarget = roundRobin(urls);

  return createProxyMiddleware({
    changeOrigin: true,
    ws: Boolean(ws),

    router: () => {
      return pickTarget();
    },

    pathRewrite: (_path: string, req: unknown) => {
      const r = req as Request;
      return r.originalUrl || r.url || '';
    },

    on: {
      proxyReq(proxyReq: ClientRequest, req: unknown) {
        const r = req as Request;

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

        if (r.requestId) {
          response.setHeader('x-request-id', r.requestId);
        }
      },

      error(err: Error, req: unknown) {
        const r = req as Request;

        logger.error(
          {
            url: r?.originalUrl,
            method: r?.method,
            err,
          },
          'Proxy forwarding error',
        );
      },
    },

    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  });
}

