import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import os from 'os';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth';
import { oauthRouter } from './routes/oauth';
import { meetingsRouter } from './routes/meetings';
import { actionItemsRouter } from './routes/action-items';
import { uploadRouter } from './routes/upload';
import { transcriptsRouter } from './routes/transcripts';
import { integrationsRouter } from './routes/integrations';
import { exportsRouter } from './routes/exports';
import organizationsRouter from './routes/organizations';
import subscriptionsRouter from './routes/subscriptions';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/oauth', oauthRouter);
app.use('/meetings', meetingsRouter);
app.use('/action-items', actionItemsRouter);
app.use('/upload', uploadRouter);
app.use('/transcripts', transcriptsRouter);
app.use('/integrations', integrationsRouter);
app.use('/exports', exportsRouter);
app.use('/organizations', organizationsRouter);
app.use('/billing', subscriptionsRouter);

app.use(errorHandler);

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(config.port, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`\n🚀 API server running!`);
  console.log(`   Local:   http://localhost:${config.port}`);
  console.log(`   Network: http://${localIp}:${config.port}`);
  console.log(`\n📱 Set this in your mobile app: http://${localIp}:${config.port}\n`);
});
