import { Router } from 'express';
import { Database, OrganizationRepository } from '@meeting-ai/database';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();
const db = new Database(config.database);
const orgRepo = new OrganizationRepository(db);

// Create organization
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      throw new AppError(400, 'Name and slug are required');
    }

    // Check if slug is unique
    const existing = await orgRepo.findBySlug(slug);
    if (existing) {
      throw new AppError(409, 'An organization with this slug already exists');
    }

    const org = await orgRepo.create(name, slug);
    
    // Add creator as owner
    await orgRepo.addMember(org.id, req.userId!, 'owner');

    res.status(201).json(org);
  } catch (error) {
    next(error);
  }
});

// Get user's organizations
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orgs = await orgRepo.findByUserId(req.userId!);
    res.json(orgs);
  } catch (error) {
    next(error);
  }
});

// Get organization by ID
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const org = await orgRepo.findById(req.params.id);
    if (!org) {
      throw new AppError(404, 'Organization not found');
    }

    // Check if user is a member
    const members = await orgRepo.getMembers(org.id);
    const isMember = members.some((m: any) => m.user_id === req.userId);
    if (!isMember) {
      throw new AppError(403, 'Access denied');
    }

    res.json({ ...org, members });
  } catch (error) {
    next(error);
  }
});

// Add member to organization
router.post('/:id/members', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId, role = 'member' } = req.body;

    if (!userId) {
      throw new AppError(400, 'User ID is required');
    }

    // Check if requester is admin or owner
    const members = await orgRepo.getMembers(req.params.id);
    const requesterMember = members.find((m: any) => m.user_id === req.userId);
    if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
      throw new AppError(403, 'Only owners and admins can add members');
    }

    const member = await orgRepo.addMember(req.params.id, userId, role);
    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
});

// Remove member from organization
router.delete('/:id/members/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check if requester is admin or owner
    const members = await orgRepo.getMembers(req.params.id);
    const requesterMember = members.find((m: any) => m.user_id === req.userId);
    if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
      throw new AppError(403, 'Only owners and admins can remove members');
    }

    await orgRepo.removeMember(req.params.id, req.params.userId);
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
});

// Update member role
router.patch('/:id/members/:userId/role', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { role } = req.body;

    if (!role || !['owner', 'admin', 'manager', 'member'].includes(role)) {
      throw new AppError(400, 'Invalid role');
    }

    // Check if requester is owner
    const members = await orgRepo.getMembers(req.params.id);
    const requesterMember = members.find((m: any) => m.user_id === req.userId);
    if (!requesterMember || requesterMember.role !== 'owner') {
      throw new AppError(403, 'Only owners can change roles');
    }

    await orgRepo.updateMemberRole(req.params.id, req.params.userId, role);
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Update organization settings
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { settings } = req.body;

    // Check if requester is admin or owner
    const members = await orgRepo.getMembers(req.params.id);
    const requesterMember = members.find((m: any) => m.user_id === req.userId);
    if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
      throw new AppError(403, 'Only owners and admins can update settings');
    }

    await orgRepo.updateSettings(req.params.id, settings);
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete organization
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check if requester is owner
    const members = await orgRepo.getMembers(req.params.id);
    const requesterMember = members.find((m: any) => m.user_id === req.userId);
    if (!requesterMember || requesterMember.role !== 'owner') {
      throw new AppError(403, 'Only owners can delete organizations');
    }

    await orgRepo.delete(req.params.id);
    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
