import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Database, UserRepository } from '@meeting-ai/database';
import { config } from '../config';
import { AppError } from '../middleware/error-handler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const db = new Database(config.database);
const userRepo = new UserRepository(db);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const updateProfileSchema = z.object({
  full_name: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  preferred_language: z.string().optional(),
  output_language: z.string().optional(),
  date_format: z.string().optional(),
  time_format: z.string().optional(),
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName } = registerSchema.parse(req.body);

    const existing = await userRepo.findByEmail(email);
    if (existing) {
      throw new AppError(400, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userRepo.create(email, passwordHash);

    await userRepo.createProfile(user.id, {
      full_name: fullName,
      user_id: user.id,
      preferred_language: 'en',
      output_language: 'en',
      date_format: 'YYYY-MM-DD',
      time_format: '24h',
    });

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: '7d' });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await userRepo.findByEmail(email);
    if (!user || !user.password_hash) {
      throw new AppError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AppError(401, 'Invalid credentials');
    }

    await userRepo.updateLastActive(user.id);

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await userRepo.findById(req.userId!);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const profile = await userRepo.getProfile(req.userId!);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified,
        status: user.status,
      },
      profile: profile || {},
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    console.log('Profile update data:', data);

    const profile = await userRepo.getProfile(req.userId!);
    console.log('Existing profile:', profile);

    if (!profile) {
      // Create profile if it doesn't exist
      await userRepo.createProfile(req.userId!, {
        full_name: data.full_name,
        country: data.country,
        timezone: data.timezone,
        preferred_language: data.preferred_language,
        output_language: data.output_language,
        date_format: data.date_format,
        time_format: data.time_format,
      });
    } else {
      // Update existing profile - only pass defined values
      const updateData: any = {};
      if (data.full_name !== undefined) updateData.full_name = data.full_name;
      if (data.country !== undefined) updateData.country = data.country;
      if (data.timezone !== undefined) updateData.timezone = data.timezone;
      if (data.preferred_language !== undefined) updateData.preferred_language = data.preferred_language;
      if (data.output_language !== undefined) updateData.output_language = data.output_language;
      if (data.date_format !== undefined) updateData.date_format = data.date_format;
      if (data.time_format !== undefined) updateData.time_format = data.time_format;

      console.log('Update data:', updateData);
      await userRepo.updateProfile(req.userId!, updateData);
    }

    const updatedProfile = await userRepo.getProfile(req.userId!);
    res.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Profile update error:', error);
    next(error);
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // In a production app, you would add the token to a blacklist
    // For now, we just return success - the client should remove the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
