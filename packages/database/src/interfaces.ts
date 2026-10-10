import {
  User,
  Profile,
  Meeting,
  Recording,
  AudioChunk,
  Transcript,
  TranscriptSegment,
  Speaker,
  ActionItem,
  MeetingSummary,
  MeetingDecision,
} from './types';
import { Organization, OrganizationMember } from './repositories/organizations';

export interface Queryable {
  query<T = any>(text: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(text: string, params?: any[]): Promise<T | null>;
}

export interface Transactional {
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}

export interface DatabasePool {
  close(): Promise<void>;
}

export interface IDatabase extends Queryable, Transactional, DatabasePool {}

export interface IMeetingReader {
  findById(id: string): Promise<Meeting | null>;
  findByUserId(userId: string, limit?: number): Promise<Meeting[]>;
}

export interface IMeetingWriter {
  create(userId: string, data: Partial<Meeting>): Promise<Meeting>;
  update(id: string, data: Partial<Meeting>): Promise<Meeting>;
  delete(id: string): Promise<void>;
}

export interface IMeetingLifecycle {
  startRecording(id: string): Promise<void>;
  stopRecording(id: string): Promise<void>;
  updateStatus(id: string, status: Meeting['status']): Promise<void>;
}

export interface IMeetingSearch {
  search(userId: string, term: string): Promise<Meeting[]>;
}

export interface IAudioRecordingStore {
  createRecording(meetingId: string, storagePath: string): Promise<Recording>;
  createAudioChunk(recordingId: string, chunkIndex: number, storagePath: string): Promise<AudioChunk>;
  getAudioChunks(recordingId: string): Promise<AudioChunk[]>;
  getRecordingByMeetingId(meetingId: string): Promise<Recording | null>;
}

export interface IMeetingRepository
  extends IMeetingReader,
    IMeetingWriter,
    IMeetingLifecycle,
    IMeetingSearch,
    IAudioRecordingStore {}

export interface IActionItemReader {
  getByMeeting(meetingId: string): Promise<ActionItem[]>;
  getByUser(userId: string, status?: ActionItem['status']): Promise<(ActionItem & { meeting_title?: string })[]>;
}

export interface IActionItemWriter {
  create(meetingId: string, data: Partial<ActionItem>): Promise<ActionItem>;
  updateStatus(id: string, status: ActionItem['status']): Promise<void>;
  update(id: string, data: Partial<ActionItem>): Promise<ActionItem>;
  delete(id: string): Promise<void>;
}

export interface IMeetingSummaryStore {
  createSummary(
    meetingId: string,
    summary: string,
    executiveSummary?: string,
    sentiment?: string,
    keyPoints?: string[]
  ): Promise<MeetingSummary>;
  getSummaryByMeeting(meetingId: string): Promise<MeetingSummary | null>;
}

export interface IMeetingDecisionStore {
  createDecision(meetingId: string, decision: string, sourceTimestamp?: number): Promise<MeetingDecision>;
  getDecisionsByMeeting(meetingId: string): Promise<MeetingDecision[]>;
}

export interface IMeetingInsightsReader {
  getRisksByMeeting(meetingId: string): Promise<any[]>;
  getFollowUpsByMeeting(meetingId: string): Promise<any[]>;
}

export interface IActionItemRepository
  extends IActionItemReader,
    IActionItemWriter,
    IMeetingSummaryStore,
    IMeetingDecisionStore,
    IMeetingInsightsReader {}

export interface ITranscriptLifecycle {
  create(meetingId: string, provider: string): Promise<Transcript>;
  updateStatus(id: string, status: Transcript['status']): Promise<void>;
  findByMeetingId(meetingId: string): Promise<Transcript | null>;
}

export interface ITranscriptSegmentStore {
  createSegment(data: Omit<TranscriptSegment, 'id'>): Promise<TranscriptSegment>;
  getSegments(transcriptId: string): Promise<TranscriptSegment[]>;
  getSegmentsByMeetingId(meetingId: string): Promise<TranscriptSegment[]>;
}

export interface ISpeakerStore {
  createSpeaker(meetingId: string, speakerLabel: string): Promise<Speaker>;
  updateSpeakerName(id: string, displayName: string): Promise<void>;
  getSpeakers(meetingId: string): Promise<Speaker[]>;
}

export interface ITranscriptRepository
  extends ITranscriptLifecycle,
    ITranscriptSegmentStore,
    ISpeakerStore {}

export interface IUserIdentityRepository {
  create(email: string, passwordHash?: string): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updateLastActive(id: string): Promise<void>;
}

export interface IUserProfileRepository {
  createProfile(userId: string, profile: Partial<Profile>): Promise<Profile>;
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, profile: Partial<Profile>): Promise<Profile>;
}

export interface IUserRepository extends IUserIdentityRepository, IUserProfileRepository {}

export interface IOrganizationStore {
  create(name: string, slug: string, settings?: any): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  findByUserId(userId: string): Promise<Organization[]>;
  updateSettings(organizationId: string, settings: any): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IOrganizationMembershipStore {
  addMember(organizationId: string, userId: string, role: 'owner' | 'admin' | 'manager' | 'member'): Promise<OrganizationMember>;
  getMembers(organizationId: string): Promise<OrganizationMember[]>;
  removeMember(organizationId: string, userId: string): Promise<void>;
  updateMemberRole(organizationId: string, userId: string, role: string): Promise<void>;
}

export interface IOrganizationRepository
  extends IOrganizationStore,
    IOrganizationMembershipStore {}
