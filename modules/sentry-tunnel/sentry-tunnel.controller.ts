import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as https from 'https';

@Controller('sentry-tunnel')
export class SentryTunnelController {
  private readonly logger = new Logger(SentryTunnelController.name);

  @Post()
  tunnel(@Req() req: Request, @Res() res: Response) {
    console.log(
      'DEBUG raw body type:',
      typeof req.body,
      'isBuffer:',
      Buffer.isBuffer(req.body),
      'length:',
      req.body?.length,
    );
    try {
      const raw = req.body as Buffer;

      if (!raw || !Buffer.isBuffer(raw) || raw.length === 0) {
        this.logger.error(
          'Empty body — check express.raw() middleware is applied to this exact path',
        );
        return res.status(400).end();
      }

      const envelope = raw.toString('utf8');
      const firstLine = envelope.split('\n')[0];
      const header = JSON.parse(firstLine);

      if (!header.dsn) {
        this.logger.error('No DSN in envelope header');
        return res.status(400).end();
      }

      const dsn = new URL(header.dsn);
      const projectId = dsn.pathname.split('/').filter(Boolean)[0];
      const sentryHost = dsn.hostname;
      const sentryKey = dsn.username;

      this.logger.log(`Forwarding to ${sentryHost} project ${projectId}`);

      const upstream = https.request(
        {
          host: '34.160.81.0',
          hostname: '34.160.81.0',
          path: `/api/${projectId}/envelope/`,
          method: 'POST',
          headers: {
            Host: sentryHost,
            'Content-Type': 'application/x-sentry-envelope',
            'X-Sentry-Auth': `Sentry sentry_key=${sentryKey}, sentry_version=7`,
            'Content-Length': Buffer.byteLength(raw),
          },
        },
        (upstreamRes) => {
          const bodyChunks: Buffer[] = [];
          upstreamRes.on('data', (c: Buffer) => bodyChunks.push(c));
          upstreamRes.on('end', () => {
            const body = Buffer.concat(bodyChunks).toString('utf8');
            this.logger.log(`Sentry status: ${upstreamRes.statusCode}`);
            this.logger.log(`Sentry response: ${body}`);
            res.status(upstreamRes.statusCode ?? 200).end();
          });
        },
      );

      upstream.on('error', (err) => {
        this.logger.error(`Upstream error: ${err.message}`);
        res.status(500).end();
      });

      upstream.write(raw);
      upstream.end();
    } catch (err) {
      this.logger.error(`Tunnel error: ${err}`);
      res.status(400).end();
    }
  }
}
