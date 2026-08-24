import { defineMiddleware } from 'astro:middleware';
import { getSessionToken, verifySessionToken } from './lib/auth';
import { apiError, UnauthorizedError } from './lib/http';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const token = getSessionToken(context.request);
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith('/api')) {
    try {
      return await next();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return apiError(401, 'unauthorized');
      }
      throw err;
    }
  }

  if (pathname.startsWith('/app')) {
    if (!session) return context.redirect('/login');
    return next();
  }

  if (pathname === '/login' || pathname === '/register') {
    if (session) return context.redirect('/app');
  }

  return next();
});