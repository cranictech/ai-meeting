import { Queryable } from '@meeti/database';
import { config } from '../config';
import { AppError } from '../middleware/error-handler';

// Plan limits are read from the server; client values are not trusted.

export interface PlanLimits {
  transcriptionMinutes: number;
  storageGB: number;
  meetings: number;
  exports: number;
  aiTokens: number;
  teamMembers: number;
  manualNotes: string; // 'unlimited' on every plan today
  templates: string; // 'basic' | 'all'
}

export interface ResolvedPlan {
  slug: string;
  name: string;
  priceMonthly: number;
  limits: PlanLimits;
  // 'subscription' = active paid row; 'default' = free plan.
  source: 'subscription' | 'default';
}

const DEFAULT_LIMITS: PlanLimits = {
  transcriptionMinutes: 60,
  storageGB: 1,
  meetings: 10,
  exports: 5,
  aiTokens: 100000,
  teamMembers: 1,
  manualNotes: 'unlimited',
  templates: 'basic',
};

function normalizeLimits(raw: any): PlanLimits {
  const l = raw && typeof raw === 'object' ? raw : {};
  return {
    transcriptionMinutes: Number(l.transcriptionMinutes ?? DEFAULT_LIMITS.transcriptionMinutes),
    storageGB: Number(l.storageGB ?? DEFAULT_LIMITS.storageGB),
    meetings: Number(l.meetings ?? DEFAULT_LIMITS.meetings),
    exports: Number(l.exports ?? DEFAULT_LIMITS.exports),
    aiTokens: Number(l.aiTokens ?? DEFAULT_LIMITS.aiTokens),
    teamMembers: Number(l.teamMembers ?? DEFAULT_LIMITS.teamMembers),
    manualNotes: String(l.manualNotes ?? 'unlimited'),
    templates: String(l.templates ?? 'basic'),
  };
}

export class UsageService {
  constructor(private db: Queryable) {}

  /** Resolve the effective plan: active subscription, else Free. */
  async resolvePlan(userId: string): Promise<ResolvedPlan> {
    const sub = await this.db.queryOne<any>(
      `SELECT p.slug, p.name, p.price_monthly, p.limits
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1
         AND s.status = 'active'
         AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (sub && sub.slug && sub.slug !== 'free') {
      return {
        slug: sub.slug,
        name: sub.name,
        priceMonthly: Number(sub.price_monthly || 0),
        limits: normalizeLimits(sub.limits),
        source: 'subscription',
      };
    }

    const free = await this.db.queryOne<any>(
      `SELECT slug, name, price_monthly, limits FROM plans WHERE slug = 'free' LIMIT 1`
    );
    if (free) {
      return {
        slug: 'free',
        name: free.name || 'Free',
        priceMonthly: 0,
        limits: normalizeLimits(free.limits),
        source: 'default',
      };
    }

    return { slug: 'free', name: 'Free', priceMonthly: 0, limits: DEFAULT_LIMITS, source: 'default' };
  }

  private async sumUsage(userId: string, resourceType: string): Promise<number> {
    const r = await this.db.queryOne<any>(
      `SELECT COALESCE(SUM(amount), 0)::float AS used
       FROM usage_records
       WHERE user_id = $1 AND resource_type = $2
         AND recorded_at >= date_trunc('month', NOW())`,
      [userId, resourceType]
    );
    return Number(r?.used || 0);
  }

  private async countUsage(userId: string, resourceType: string): Promise<number> {
    const r = await this.db.queryOne<any>(
      `SELECT COUNT(*)::int AS c
       FROM usage_records
       WHERE user_id = $1 AND resource_type = $2
         AND recorded_at >= date_trunc('month', NOW())`,
      [userId, resourceType]
    );
    return Number(r?.c || 0);
  }

  /** Remaining allowance for the UI. */
  async summary(userId: string) {
    const plan = await this.resolvePlan(userId);
    const [minutesUsed, exportsUsed] = await Promise.all([
      this.sumUsage(userId, 'transcription_minutes'),
      this.countUsage(userId, 'export'),
    ]);
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      plan: { slug: plan.slug, name: plan.name, priceMonthly: plan.priceMonthly, source: plan.source },
      limits: plan.limits,
      transcriptionMinutes: {
        limit: plan.limits.transcriptionMinutes,
        used: round(minutesUsed),
        remaining: Math.max(0, plan.limits.transcriptionMinutes - minutesUsed),
      },
      exports: {
        limit: plan.limits.exports,
        used: exportsUsed,
        remaining: Math.max(0, plan.limits.exports - exportsUsed),
      },
    };
  }

  /** Gate before an AI transcription job. Throws 402 or 413. */
  async assertCanProcessRecording(userId: string, durationSeconds: number): Promise<void> {
    if (durationSeconds && durationSeconds > config.limits.maxRecordingSeconds) {
      throw new AppError(
        413,
        `That recording is longer than the ${Math.round(config.limits.maxRecordingSeconds / 60)}-minute maximum.`
      );
    }

    const plan = await this.resolvePlan(userId);
    const minutes = Math.max(1, Math.ceil((durationSeconds || 0) / 60));
    const used = await this.sumUsage(userId, 'transcription_minutes');

    if (used + minutes > plan.limits.transcriptionMinutes) {
      throw new AppError(
        402,
        `You've used your ${plan.name} plan's transcription allowance (${Math.round(used)} of ${plan.limits.transcriptionMinutes} minutes this month). Your manual notes stay free — upgrade to Pro for a larger AI allowance.`
      );
    }
  }

  /** Gate before generating a downloadable export. */
  async assertCanExport(userId: string): Promise<void> {
    const plan = await this.resolvePlan(userId);
    const used = await this.countUsage(userId, 'export');
    if (used >= plan.limits.exports) {
      throw new AppError(
        402,
        `You've used all ${plan.limits.exports} exports included in the ${plan.name} plan this month. Upgrade for more, or copy your notes directly (always free).`
      );
    }
  }

  /** Meter usage. A dedupeKey prevents double-counting. */
  async record(opts: {
    userId: string;
    resourceType: string;
    amount: number;
    unit?: string;
    cost?: number;
    dedupeKey?: string | null;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const { userId, resourceType, amount, unit, cost, dedupeKey, metadata } = opts;
    if (dedupeKey) {
      await this.db.query(
        `INSERT INTO usage_records (user_id, resource_type, amount, unit, cost, metadata, dedupe_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
        [userId, resourceType, amount, unit ?? null, cost ?? 0, JSON.stringify(metadata ?? {}), dedupeKey]
      );
      return;
    }
    await this.db.query(
      `INSERT INTO usage_records (user_id, resource_type, amount, unit, cost, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, resourceType, amount, unit ?? null, cost ?? 0, JSON.stringify(metadata ?? {})]
    );
  }

  /** Metering helpers for the worker and export routes. */
  async meterTranscription(userId: string, meetingId: string, durationSeconds: number): Promise<void> {
    const minutes = Math.max(1, Math.ceil((durationSeconds || 0) / 60));
    await this.record({
      userId,
      resourceType: 'transcription_minutes',
      amount: minutes,
      unit: 'minutes',
      cost: Math.round(minutes * config.costs.transcriptionUsdPerMinute * 10000) / 10000,
      dedupeKey: `meeting:${meetingId}:transcription`,
      metadata: { meetingId, estimated: true },
    });
  }

  async meterExport(userId: string, meetingId: string, format: string): Promise<void> {
    await this.record({
      userId,
      resourceType: 'export',
      amount: 1,
      unit: 'count',
      metadata: { meetingId, format },
    });
  }
}

export function getUsageService(db: Queryable): UsageService {
  return new UsageService(db);
}
