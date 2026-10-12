import { Router } from 'express';
import { Database } from '@meeti/database';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { getUsageService } from '../services/usage';

const router = Router();
const db = new Database(config.database);
const usage = getUsageService(db);

// Public plan catalogue.
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await db.query(
      `SELECT id, name, slug, price_monthly, price_annual, limits, features
       FROM plans WHERE active = true ORDER BY price_monthly`
    );
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

// Effective plan for the current user (Free when there is no paid subscription).
router.get('/subscription', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const plan = await usage.resolvePlan(req.userId!);
    res.json({
      plan_slug: plan.slug,
      plan_name: plan.name,
      price_monthly: plan.priceMonthly,
      status: plan.source === 'subscription' ? 'active' : 'free',
      source: plan.source,
    });
  } catch (error) {
    next(error);
  }
});

// Remaining allowance for the current month, computed on the server.
router.get('/usage-summary', authenticate, async (req: AuthRequest, res, next) => {
  try {
    res.json(await usage.summary(req.userId!));
  } catch (error) {
    next(error);
  }
});

// Historical usage for the current user (read-only).
router.get('/usage', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    let query = 'SELECT resource_type, amount, unit, cost, metadata, recorded_at FROM usage_records WHERE user_id = $1';
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
    res.json(await db.query(query, params));
  } catch (error) {
    next(error);
  }
});

// Paid plans require a verified payment event and cannot be self-activated.
// Free is the implicit default.
router.post('/subscription', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { planId } = req.body;
    if (!planId) throw new AppError(400, 'Plan ID is required');

    const plan = await db.queryOne<any>('SELECT * FROM plans WHERE id = $1', [planId]);
    if (!plan) throw new AppError(404, 'Plan not found');

    if (Number(plan.price_monthly || 0) > 0) {
      // No paid access without verified payment.
      throw new AppError(
        402,
        `Upgrading to ${plan.name} requires a completed payment. Online checkout isn't enabled yet, so no paid access was granted. Your free manual notes remain fully available.`
      );
    }

    // Free switch cancels any active paid rows.
    await db.query(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW()
       WHERE user_id = $1 AND status = 'active'`,
      [req.userId]
    );
    res.json({ message: 'Free plan is active. No payment required.', plan_slug: 'free', status: 'free' });
  } catch (error) {
    next(error);
  }
});

// Cancel a paid subscription at period end. Free users are a no-op.
router.post('/subscription/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const subscription = await db.queryOne(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [req.userId]
    );
    if (!subscription) {
      // Nothing to cancel on the free plan.
      return res.json({ message: 'No active paid subscription. You are on the Free plan.' });
    }
    await db.query(
      `UPDATE subscriptions
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $2`,
      [subscription.cancel_at || new Date(), subscription.id]
    );
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

// Checkout placeholder; payment providers are not configured yet.
router.post('/checkout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { planId } = req.body;
    const plan = planId
      ? await db.queryOne<any>('SELECT name FROM plans WHERE id = $1', [planId])
      : null;
    throw new AppError(
      501,
      `Checkout for ${plan?.name || 'the selected plan'} isn't available yet — payment processing has not been configured on this server. You can keep using Meeti's free features.`
    );
  } catch (error) {
    next(error);
  }
});

export default router;
