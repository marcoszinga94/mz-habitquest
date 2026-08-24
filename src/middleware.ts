import { defineMiddleware } from 'astro:middleware';
import { getSessionToken, verifySessionToken } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const token = getSessionToken(context.request);
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith('/api')) {
    return next();
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