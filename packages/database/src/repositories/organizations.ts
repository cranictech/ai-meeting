import { Database } from '../index';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  settings: any;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  joined_at: string;
}

export class OrganizationRepository {
  constructor(private db: Database) {}

  async create(name: string, slug: string, settings: any = {}): Promise<Organization> {
    const result = await this.db.queryOne(
      'INSERT INTO organizations (name, slug, settings) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, settings]
    );
    return result;
  }

  async findById(id: string): Promise<Organization | null> {
    const result = await this.db.queryOne('SELECT * FROM organizations WHERE id = $1', [id]);
    return result;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const result = await this.db.queryOne('SELECT * FROM organizations WHERE slug = $1', [slug]);
    return result;
  }

  async findByUserId(userId: string): Promise<Organization[]> {
    const results = await this.db.query(
      `SELECT o.* FROM organizations o
       JOIN organization_members om ON o.id = om.organization_id
       WHERE om.user_id = $1`,
      [userId]
    );
    return results;
  }

  async addMember(organizationId: string, userId: string, role: 'owner' | 'admin' | 'manager' | 'member'): Promise<OrganizationMember> {
    const result = await this.db.queryOne(
      'INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
      [organizationId, userId, role]
    );
    return result;
  }

  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    const results = await this.db.query(
      `SELECT om.*, u.email, p.full_name 
       FROM organization_members om
       JOIN users u ON om.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE om.organization_id = $1
       ORDER BY om.joined_at`,
      [organizationId]
    );
    return results;
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    await this.db.query(
      'DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [organizationId, userId]
    );
  }

  async updateMemberRole(organizationId: string, userId: string, role: string): Promise<void> {
    await this.db.query(
      'UPDATE organization_members SET role = $1 WHERE organization_id = $2 AND user_id = $3',
      [role, organizationId, userId]
    );
  }

  async updateSettings(organizationId: string, settings: any): Promise<void> {
    await this.db.query(
      'UPDATE organizations SET settings = $1 WHERE id = $2',
      [JSON.stringify(settings), organizationId]
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM organizations WHERE id = $1', [id]);
  }
}
