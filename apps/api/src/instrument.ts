import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: 'https://47cf3cb3bf19434707fb14618a2cb424@o4511626412687360.ingest.de.sentry.io/4511626435297360',
  tunnel: `http://localhost:${process.env.PORT ?? 3001}/v1/sentry-tunnel`,
  tracesSampleRate: 0.1,
  sendDefaultPii: true,
});
