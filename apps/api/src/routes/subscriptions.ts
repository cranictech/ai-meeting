import { Router } from 'express';
import { Database } from '@meeting-ai/database';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();
const db = new Database(config.database);

// Get available plans
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await db.query('SELECT * FROM plans WHERE active = true ORDER BY price_monthly');
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

// Get user's subscription
router.get('/subscription', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const subscription = await db.queryOne(
      `SELECT s.*, p.name as plan_name, p.features 
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [req.userId]
    );
    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

// Create subscription (for billing webhooks)
router.post('/subscription', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { planId, provider, providerSubscriptionId } = req.body;

    if (!planId) {
      throw new AppError(400, 'Plan ID is required');
    }

    // Check if plan exists
    const plan = await db.queryOne('SELECT * FROM plans WHERE id = $1', [planId]);
    if (!plan) {
      throw new AppError(404, 'Plan not found');
    }

    // Cancel existing active subscription
    await db.query(
      `UPDATE subscriptions 
       SET status = 'cancelled', cancelled_at = NOW() 
       WHERE user_id = $1 AND status = 'active'`,
      [req.userId]
    );

    // Create new subscription
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await db.queryOne(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, provider, provider_subscription_id)
       VALUES ($1, $2, 'active', $3, $4, $5, $6)
       RETURNING *`,
      [req.userId, planId, now, periodEnd, provider, providerSubscriptionId]
    );

    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
});

// Cancel subscription
router.post('/subscription/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const subscription = await db.queryOne(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.userId]
    );

    if (!subscription) {
      throw new AppError(404, 'No active subscription found');
    }

    await db.query(
      `UPDATE subscriptions 
       SET status = 'cancelled', cancel_at = $1, cancelled_at = NOW()
       WHERE id = $2`,
      [subscription.cancel_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), subscription.id]
    );

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

// Record usage
router.post('/usage', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { resourceType, amount, unit, cost, metadata } = req.body;

    if (!resourceType || !amount) {
      throw new AppError(400, 'Resource type and amount are required');
    }

    await db.query(
      `INSERT INTO usage_records (user_id, resource_type, amount, unit, cost, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, resourceType, amount, unit, cost || 0, JSON.stringify(metadata || {})]
    );

    res.status(201).json({ message: 'Usage recorded successfully' });
  } catch (error) {
    next(error);
  }
});

// Get usage statistics
router.get('/usage', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let query = 'SELECT * FROM usage_records WHERE user_id = $1';
    const params: any[] = [req.userId];

    if (startDate) {
      query += ' AND recorded_at >= $2';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND recorded_at <= $3';
      params.push(endDate);
    }

    query += ' ORDER BY recorded_at DESC';

    const usage = await db.query(query, params);
    res.json(usage);
  } catch (error) {
    next(error);
  }
});

export default router;
