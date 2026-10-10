import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { apiKeyService } from '../services/api-key';

const router = Router();

router.use(authenticate);

// List API keys (never return the actual key)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const keys = await apiKeyService.list(req.userId!);
    res.json(keys);
  } catch (error) {
    next(error);
  }
});

// Create an API key (key is shown ONCE in the response)
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { name, scopes, expiresAt } = req.body;

    if (!name || name.trim().length === 0) throw new AppError(400, 'Name is required');

    const validScopes = ['read', 'write', 'admin'];
    if (scopes && !scopes.every((s: string) => validScopes.includes(s))) {
      throw new AppError(400, `Invalid scopes. Allowed: ${validScopes.join(', ')}`);
    }

    const expires = expiresAt ? new Date(expiresAt) : undefined;
    if (expires && isNaN(expires.getTime())) {
      throw new AppError(400, 'Invalid expiry date');
    }

    const key = await apiKeyService.create(req.userId!, name.trim(), scopes, expires);
    res.status(201).json(key);
  } catch (error) {
    next(error);
  }
});

// Revoke an API key
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await apiKeyService.revoke(req.userId!, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as apiKeysRouter };
