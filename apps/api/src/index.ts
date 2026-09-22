import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth';
import { oauthRouter } from './routes/oauth';
import { meetingsRouter } from './routes/meetings';
import { actionItemsRouter } from './routes/action-items';
import { uploadRouter } from './routes/upload';

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

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API server running on port ${config.port}`);
});
