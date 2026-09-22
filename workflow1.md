# AI Meeting Notes Platform — Complete Blueprint, Workflow, and Production Readiness Specification

**Version:** 1.0
**Last Updated:** 2026-09-21

---

# PART 1 — PRODUCT BLUEPRINT

## 1. What you are building

Listen to a meeting in multiple languages → identify speakers → transcribe → translate where necessary → understand the meeting → create professional English notes → identify decisions/tasks/deadlines → let the user review/edit → save and synchronize across devices and services.

Must work on: iPhone, Samsung/Android, Web, Gmail, Google Drive, Google Docs, Apple Notes, optionally Microsoft OneNote/Outlook later.

## 2. Complete user journey

```
DOWNLOAD / OPEN APP
        ↓
CREATE ACCOUNT
        ↓
ONBOARDING
        ↓
PERMISSIONS
        ↓
HOME
        ↓
NEW MEETING
        ↓
MEETING SETTINGS
        ↓
RECORDING
        ↓
LIVE PROCESSING
        ↓
MEETING ENDS
        ↓
PROCESSING
        ↓
TRANSCRIPTION
        ↓
LANGUAGE DETECTION
        ↓
SPEAKER IDENTIFICATION
        ↓
TRANSLATION
        ↓
AI UNDERSTANDING
        ↓
AI NOTES
        ↓
USER REVIEW
        ↓
EDIT / APPROVE
        ↓
SAVE
        ↓
SYNC
        ↓
EXPORT / SHARE
```

## 3. Platforms

- Mobile iOS: iPhone, iPad
- Mobile Android: Samsung, Google Pixel, Xiaomi, Tecno, Infinix, other Android
- Web: Windows, Mac, Linux, Chromebook

Same account everywhere.

```
              ACCOUNT
                 │
      ┌──────────┼──────────┐
      ↓          ↓          ↓
    iPhone     Android      Web
```

## 4. Account system

- Google — Continue with Google
- Apple — Continue with Apple
- Email + Password + Confirm password
- Phone (optional): +256 7XX XXX XXX → OTP

## 5. User profile

```
Profile
──────────────
Full name
Profile photo
Email
Phone
Country
Timezone
Preferred language
Output language
Date format
Time format
```

## 6. Onboarding

Ask: What will you use this for?
Business meetings / Classes / Interviews / Client meetings / Church meetings / Team meetings / Personal notes / Research / Other

Then: Preferred notes language (English default).

## 7. Permissions

- Microphone — required
- Notifications — processing finished, reminders, follow-ups
- Calendar — only if user enables
- Contacts — only if necessary

Do not request everything at first launch.

## 8. Home screen

```
Good morning, David

┌───────────────────────────────┐
│       🎙 Start Meeting        │
│       Record & take notes     │
└───────────────────────────────┘

Recent Meetings

Project Planning
Today · 32 minutes

Marketing Meeting
Yesterday · 48 minutes

Staff Meeting
Sep 18 · 1 hour

───────────────────────────────

Home   Meetings   Search   Settings
```

## 9. New meeting

```
New Meeting

Meeting title
[ Project Planning ]

Meeting type
[ Business Meeting ▼ ]

Language
[ Auto Detect ▼ ]

Notes language
[ English ▼ ]

Participants
[ Add participants ]

Recording quality
[ Standard ▼ ]

        START RECORDING
```

## 10. Automatic language detection

- Speaker 1 → English
- Speaker 2 → Luganda
- Speaker 3 → English
- Speaker 1 → Swahili

Preserve: original language, original text, translated text. Never destroy the original transcript.

## 11. Language support

Uganda/East Africa priority: English, Luganda, Swahili, Runyankole, Rukiga, Ateso, Luo, Acholi.

Then international: French, Spanish, German, Portuguese, Arabic, Italian, Dutch, Hindi, Chinese, Japanese.

## 12. Recording engine

```
Microphone
     ↓
Audio capture
     ↓
Noise reduction
     ↓
Voice activity detection
     ↓
Audio chunks
     ↓
Upload/stream
```

Chunks of 10s. Do not wait for a 2-hour recording to upload at the end.

## 13. Offline recording

```
Recording
   ↓
Local encrypted storage
   ↓
Internet returns
   ↓
Upload automatically
   ↓
AI processing
```

## 14. Live meeting screen

```
Project Planning Meeting

● RECORDING

00:32:41

Listening...

John
"We should finish the website by Friday."

Sarah
"I will send the marketing report tomorrow."

────────────────────────

Detected:
✓ Decision
✓ Action item
✓ Deadline

        PAUSE       STOP
```

## 15. Pause and resume

Support Pause, Resume, Stop. Final recording remains one meeting.

## 16. Phone call meetings

Do not assume free call recording. Support instead: in-person (phone mic), speakerphone (phone mic captures room), online meeting (integrate with conferencing platforms).

Later: Zoom, Google Meet, Microsoft Teams.

## 17. Speaker identification

Recognize Speaker 1, Speaker 2, Speaker 3. Allow renaming: Speaker 1 → John, etc. Optional voice memory with consent.

## 18. Transcript

```
Transcript

10:30
John:
We need to finish the website by Friday.

10:31
Sarah:
I will send the report tomorrow.

10:32
David:
Let's review everything on Thursday.
```

Each segment: speaker, timestamp, language, original text, translated text, confidence.

## 19. Translation

Original: "Tujja kusisinkana ku Monday."
English: "We will meet again on Monday."

Keep both.

## 20. AI understanding

Summary, Topics, Decisions, Action items, Deadlines, Questions, Risks, Follow-ups, Important information.

## 21. Final notebook format

```
Project Planning Meeting

21 September 2026

Duration: 48 minutes

Executive Summary
Short summary.

Key Discussion Points
Website development
Marketing
Launch schedule

Decisions
Website launch planned for Friday.
Marketing materials must be reviewed before publishing.

Action Items
Person	Task	Deadline	Status
John	Complete website	Friday	Pending
Sarah	Send report	Tomorrow	Pending

Questions
Who will approve the final design?

Next Meeting
Monday at 10:00 AM.
```

## 22. User editing

Edit, delete, add, move sections, rename speakers, correct transcript, correct task, change deadline.

## 23. AI correction

Ask AI: "Make shorter." / "Translate to English." / "Show only action items." / "Create an email from these notes."

## 24. Search

Global search across titles, transcripts, summaries, action items, participants, dates.

## 25. Filters

All, Today, This week, This month, My meetings, Shared with me, Starred, Archived.

## 26. Folders

Work, Clients, School, Church, Personal, Interviews, Projects. Users can create their own.

## 27. Tags

#client #website #marketing #urgent #followup

## 28. Star/favorite

⭐ Important

## 29. Archive

Old meetings go to Archive.

## 30. Trash

Deleted meetings go to Trash. Permanent deletion allowed.

## 31. Export

PDF, DOCX, TXT, Markdown, CSV.

## 32. Sharing

Link, Email, PDF, Google Docs, WhatsApp, Copy text.

## 33. Shared meetings

Owner → Invite team members → View/edit/comment.

Permissions: Owner, Editor, Viewer, Commenter.

## 34. Comments

Highlight "Website launch Friday" → comment "Confirm this with John."

## 35. Google integration

OAuth. Gmail (send notes), Drive (save notes), Docs (create documents), Calendar (attach notes).

```
Calendar event → Meeting begins → AI records → Meeting ends → Notes generated → Attached to calendar event
```

## 36. Apple integration

Apple Notes (export/save where supported), Apple Calendar (potential), iCloud (only where APIs permit). Do not assume unrestricted Notes DB access.

## 37. Microsoft integration

Later: Outlook, OneDrive, Word, Teams, OneNote.

## 38. Gmail account connection

```
Connected accounts

Google
✓ Gmail
✓ Drive
✓ Calendar

[Disconnect Google]
```

Never ask for a Gmail password. Use OAuth.

## 39. Notifications

Processing complete. Notes ready. Action item due tomorrow. Meeting in 10 minutes. 3 overdue action items.

## 40. Reminders

"John — Complete website — Due Friday" → Reminder Friday 9:00 AM.

## 41. Calendar

Create meeting or import existing meetings.

## 42. AI action-item tracking

Pending, In progress, Completed, Overdue, Cancelled.

## 43. AI follow-up

Meeting: "Sarah will send the report tomorrow."
System: Task — Sarah — Send report — Due tomorrow.
Later: "Sarah, did you complete the report?"

## 44. Email follow-up

AI creates Subject + Body. User reviews before sending.

## 45. Meeting templates

General, Sales, Interview, Class, Client, Project, Board, Church, Research Interview, Performance Review.

## 46. Interview mode

Interviewer, Candidate, Questions, Answers, Skills, Experience, Important statements, Follow-up questions.

## 47. Sales mode

Customer, Needs, Pain points, Budget, Objections, Competitors, Next steps, Deal value, Follow-up date.

## 48. Education mode

Topic, Important concepts, Definitions, Examples, Questions, Study notes, Homework.

## 49. Business mode

Agenda, Discussion, Decisions, Action items, Owners, Deadlines, Risks, Next meeting.

## 50. Admin dashboard

Users, Meetings, Storage, AI usage, Subscriptions, Revenue, Errors, Reports, Support, Security.

## 51. Admin user management

Search by Name, Email, Phone, User ID. View: Account status, Plan, Meetings, Storage, Created date, Last active.

Do not expose meeting content to ordinary admins without audited access.

## 52. Subscription system

Free: limited minutes, limited storage, basic AI notes.
Pro: more transcription, more storage, advanced AI, exports, integrations.
Business: team accounts, shared meetings, administration, advanced controls.

Do not hard-code pricing before calculating actual AI/storage costs.

## 53. Usage limits

Transcription minutes, AI tokens, storage, meetings, exports, API usage.

## 54. Billing

Stripe, Paddle, regional/mobile-money. Uganda: Mobile Money, Airtel Money, cards. Do not depend on one provider.

## 55. Database

PostgreSQL. Core tables: users, profiles, organizations, organization_members, subscriptions, plans, meetings, meeting_participants, recordings, audio_chunks, transcripts, transcript_segments, speakers, speaker_profiles, meeting_summaries, meeting_topics, meeting_decisions, action_items, tasks, comments, folders, tags, meeting_tags, exports, notifications, integrations, oauth_accounts, calendar_events, audit_logs, usage_records, billing_events.

## 56. File storage

```
PostgreSQL → metadata
Object Storage → audio, exports, attachments
```

Providers: AWS S3, Cloudflare R2, Google Cloud Storage, Supabase Storage.

## 57. Backend

Node.js + TypeScript, or Python + FastAPI.

Services: API, Authentication, Meeting, Transcription, AI, Storage, Integration, Billing, Notification.

## 58. Background workers

```
User stops meeting → Create job → Queue → Worker → Transcription → AI analysis → Notes → Notify user
```

Redis, BullMQ, Celery, or cloud queues.

## 59. Real-time communication

Mobile ↕ WebSocket / streaming ↕ Backend.

## 60. AI providers

Provider abstraction. Provider A / B / C behind one interface. Same for speech recognition.

## 61. Speech-to-text

Multilingual, timestamps, diarization, confidence, streaming, long recordings, noisy environments. Test with Ugandan accents and local languages before claiming quality.

## 62. AI prompt architecture

```
Transcription → Cleaning → Language normalization → Information extraction → Summarization → Action-item extraction → Final formatting
```

## 63. Structured AI output

```json
{
  "summary": "...",
  "decisions": [],
  "action_items": [],
  "questions": [],
  "topics": [],
  "next_meeting": null
}
```

Backend validates before saving.

## 64. AI hallucination protection

Instruction: "Only extract information supported by the transcript. If uncertain, mark uncertain rather than inventing."

Link items to timestamps.

```
Action Item: Complete website by Friday
Source: 10:32:14
```

## 65. Confidence system

High / Medium / Low for uncertain transcription or extraction.

## 66. Security

Encryption in transit and at rest. Secure sessions/tokens. User-scoped authorization. Org isolation. Rate limiting. Audit logs.

## 67. Account deletion

Define what happens to meetings, recordings, transcripts, integrations, billing data, backups.

## 68. Data deletion

Meeting, Recording, Transcript, Notes, Account.

## 69. Retention settings

30 days / 90 days / 1 year / Forever. Or delete audio after transcription.

## 70. Consent

"Recording started. Please ensure everyone participating knows the meeting is being recorded and that recording is permitted under applicable law."

Legal review required.

## 71. Privacy policy

Data collected, audio, transcripts, AI processing, storage, processors, integrations, retention, deletion, user rights.

## 72. Terms of service

Acceptable use, subscriptions, refunds, termination, IP, liability, availability. Legal review required.

## 73. GDPR

Assess if serving European users.

## 74. Other privacy laws

US state laws, UK GDPR, Uganda DPA, other target countries.

## 75. Data residency

US / Europe / other regions if required.

## 76. Organization/team system

Company → Admin, Manager, Employee, Employee.

## 77. Enterprise controls

SSO, SCIM, audit logs, retention policies, admin controls, data export, custom AI policies.

## 78. Mobile notifications

APNs (iOS), FCM (Android).

## 79. Web notifications

Browser notifications for processing complete, reminders, action items.

## 80. Email system

Verification, password reset, meeting processing, invitations, reminders, billing, security alerts. Use a transactional provider.

## 81. Support

Help & Support: report problems, feedback, contact, FAQs.

## 82. Error reporting

Crash reporting, server logs, AI logs, failed job monitoring, performance monitoring.

## 83. Analytics

account_created, meeting_started, meeting_completed, notes_generated, export_created, integration_connected, subscription_started.

## 84. Don't collect unnecessary sensitive data

Never send full transcripts to analytics.

## 85. Testing

Backend: auth, permissions, DB, APIs, billing, AI, language detection, transcription, summaries, action extraction.
Mobile: recording, interruptions, calls, Bluetooth, headphones, background, battery, offline.
Web: browser compatibility, uploads, playback, exports.

## 86. Critical mobile tests

Screen locked, incoming call, Bluetooth, AirPods, Samsung Buds, low battery, no internet, weak internet, backgrounded, killed, restarted, storage full, mic unavailable.

## 87. Audio quality tests

Quiet office, noisy office, restaurant, classroom, outdoor, conference room, multiple speakers, far mic, accents, code switching. Especially English + Luganda + Swahili mixed.

## 88. Web architecture

Landing, Login, Dashboard, Meeting page, Transcript, Notes, Search, Settings, Billing, Integrations.

## 89. Mobile architecture

Tabs: Home, Meetings, Search, Profile. Recording from Home.

## 90. Meeting page

```
Meeting title
Summary
Transcript
Actions
Decisions
Questions
Files
Activity

[Ask AI] [Share] [Export]
```

## 91. Ask AI inside each meeting

"What did John agree to do?" → answer. "What decisions were made?" → list.

## 92. Cross-meeting AI

"What did we decide about X last month?" → searches authorized meetings.

## 93. Knowledge base

Meetings, Documents, Notes, Tasks, Decisions, Knowledge.

## 94. File attachments

PDF, Word, PowerPoint, images, spreadsheets as context.

## 95. Meeting agenda

Agenda used by AI to structure notes.

## 96. Meeting preparation

"Prepare me" → previous meeting, outstanding tasks, decisions, documents, agenda.

## 97. Meeting follow-up

Notes, Tasks, Email draft, Calendar follow-up, Shared document.

## 98. Integrations architecture

Integration Service. Google, Apple, Microsoft, Slack, WhatsApp, Zoom, Teams, Calendar, Drive. Do not scatter integration code.

## 99. API design

```
POST /auth/login
POST /meetings
POST /meetings/:id/start
POST /meetings/:id/stop
GET /meetings
GET /meetings/:id
GET /meetings/:id/transcript
GET /meetings/:id/notes
POST /meetings/:id/export
POST /meetings/:id/share
POST /integrations/google/connect
DELETE /integrations/google
GET /tasks
PATCH /tasks/:id
```

## 100. Webhooks

Payment completed, payment failed, Google integration events, AI processing events.

## 101. Queue architecture

```
Meeting completed → Job Queue → Audio Processing → STT → Diarization → Translation → AI Extraction → Summary → Save DB → Export → Notification
```

Every stage retryable.

## 102. Failed processing

"We couldn't finish processing your meeting. Your recording is safe. [Retry]"

## 103. Long meetings

3-hour recording → chunks → transcribe → merge → summarize.

## 104. Cost control

Track audio minutes, AI tokens, storage GB, exports, API calls. Calculate cost per user.

## 105. Free plan protection

Rate limits, quotas, max recording length, storage limits.

## 106. Abuse protection

CAPTCHA, rate limits, email verification, upload limits.

## 107. Audio file security

Private storage + temporary signed URLs.

## 108. Authentication security

Secure password hashing, short-lived tokens, refresh, secure cookies, MFA later.

## 109. MFA

Authenticator app, Email OTP, Security keys.

## 110. Admin security

MFA, RBAC, audit logging.

## 111. Deployment

Development → Staging → Production. Never build on production.

## 112. Infrastructure

```
Frontend → Vercel / Cloudflare
Backend → Cloud server/container
PostgreSQL → Managed PostgreSQL
Redis → Managed Redis
Audio → Object Storage
AI → AI APIs
Monitoring → Error/metrics platform
```

## 113. Domain

yourproduct.com, app.yourproduct.com, api.yourproduct.com, status.yourproduct.com.

## 114. Landing page

"Turn every meeting into clear, actionable notes." Record, Understand, Remember, Act.

## 115. Pricing page

Free, Pro, Business, Enterprise with actual limits.

## 116. Trust page

Security, privacy, encryption, deletion, compliance, infrastructure. Only claim certifications you have.

## 117. Status page

API, Recording, AI, Storage — Operational.

## 118. Documentation

Help Center, Getting Started, Recording, Notes, Exports, Integrations, Billing, Privacy, Security.

## 119. Developer API

```
POST /v1/meetings
GET /v1/meetings/:id
GET /v1/meetings/:id/notes
```

## 120. SDK

JavaScript, Python, iOS, Android.

## 121. Version 1 — build this first

```
ACCOUNT → HOME → START MEETING → RECORD → UPLOAD/STREAM → TRANSCRIPTION → LANGUAGE DETECTION → ENGLISH NOTES → ACTION ITEMS → SAVE → SEARCH
```

Then: Google Login, Drive, Gmail, PDF/DOCX.
Then: Android, iPhone.
Then: Teams, Orgs, Billing, Advanced AI.

## 122. Recommended tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS + component system |
| Mobile | React Native / Expo |
| Backend | Node.js + TypeScript |
| API | REST + WebSockets |
| Database | PostgreSQL |
| Cache/queues | Redis |
| Storage | S3-compatible |
| Auth | OAuth + secure sessions |
| AI | STT + LLM provider abstraction |
| Deployment | Vercel + cloud/container |

## 123. Project structure

```
meeting-ai/
├── apps/ (web, mobile, admin, api)
├── packages/ (database, auth, ai, transcription, storage, integrations, notifications, billing, ui, types)
├── infrastructure/
├── docs/
├── tests/
└── README.md
```

## 124. The AI engine

```
                 MEETING AI
                     │
      ┌──────────────┼──────────────┐
      ↓              ↓              ↓
 Transcription   Language       Speaker
    Agent        Agent          Agent
      │              │              │
      └──────────────┼──────────────┘
                     ↓
               Understanding Agent
                     ↓
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
    Summary       Decisions      Actions
       │             │             │
       └─────────────┼─────────────┘
                     ↓
                 Note Writer
                     ↓
              Quality Checker
                     ↓
                Final Notes
```

Quality checker: every action item supported? every deadline mentioned? summary introduced new info?

## 125. Final product vision

```
             YOUR AI MEETING ASSISTANT
                 │
     ┌───────────┼───────────┐
     ↓           ↓           ↓
   LISTEN     UNDERSTAND   REMEMBER
     │           │           │
     ↓           ↓           ↓
 Transcribe   Summarize   Knowledge
     │           │           │
     └───────────┼───────────┘
                 ↓
               ACT
                 │
       ┌─────────┼─────────┐
       ↓         ↓         ↓
      Tasks     Email    Calendar
```

### One change to the original idea

Do not make "stores on someone's Gmail" the core storage architecture. Use your own secure database + private file storage as source of truth. Sync to Gmail / Drive / Apple Notes as destinations.

---

# PART 2 — MASTER WORKFLOW

## 1. High-Level Lifecycle

```
ACCOUNT → ONBOARDING → PERMISSIONS → HOME → START MEETING → RECORD → UPLOAD / STREAM → TRANSCRIBE → DETECT LANGUAGE → IDENTIFY SPEAKERS → TRANSLATE → AI UNDERSTANDING → GENERATE NOTES → USER REVIEW → EDIT / APPROVE → SAVE → SYNC → EXPORT / SHARE → FOLLOW-UP → TASKS / REMINDERS / CALENDAR
```

## 2. Pre-Build & Compliance Workflow

### 2.1 Legal
- Privacy Policy drafted and legally reviewed
- Terms of Service drafted and legally reviewed
- DPA template for business customers
- Subprocessor list published
- Consent flow for all-party consent jurisdictions
- GDPR / UK GDPR assessment
- Uganda Data Protection Act review
- AI Act risk assessment if serving EU
- Voice biometrics consent flow if using speaker recognition
- Age verification / parental consent if targeting students
- Trademark search and filing
- Business entity registered
- Tax / VAT registration in target markets

### 2.2 Infrastructure
- Domain purchased
- Subdomains: app, api, status, docs
- Cloud provider accounts
- Managed PostgreSQL
- Managed Redis
- Private object storage
- CDN
- SSL/TLS certificates
- Secrets management
- CI/CD pipeline
- Staging environment
- Production environment
- Monitoring and error tracking
- Logging aggregation
- Backup strategy
- Disaster recovery plan

### 2.3 Third-Party Services
- Speech-to-text provider
- LLM provider
- Translation provider
- Transactional email provider
- Payment provider
- Push notification service
- SMS provider for OTP
- Google OAuth app
- Apple OAuth app
- Analytics provider
- Customer support tool

## 3. User Onboarding Workflow

```
Landing Page → Get Started → Choose Signup Method (Google / Apple / Email / Phone) → Verify → Onboarding Survey → Request Permissions → Home Screen
```

## 4. Meeting Recording Workflow

```
Home → Start Meeting → Meeting Setup → Start Recording → Consent Reminder → Recording Screen → Stop → Save/Discard → Upload Queue → Processing Screen → Notes Ready
```

Failure paths:
- No internet → save locally → auto-upload
- App killed → recover from local storage
- Upload fails → retry with backoff
- Processing fails → keep audio → allow retry

## 5. Processing Pipeline Workflow

```
Meeting Completed → Create Job → Queue → Worker → Download Chunks → Merge → STT (language, timestamps, confidence) → Diarization → Translation → AI Understanding → Quality Check → Note Formatting → Save DB → Exports → Notify User
```

Retry: max 3 per stage, backoff 1m/5m/15m, then DLQ + alert.

## 6. Review, Edit, Ask AI Workflow

```
Meeting Detail → Tabs (Summary/Transcript/Actions/Decisions/Questions/Files) → Edit Mode → Ask AI → Save → Version History
```

## 7. Export & Share Workflow

```
Meeting Detail → Share/Export → Choose destination → Configure permissions → Generate & Send → Confirmation
```

## 8. Follow-Up & Task Tracking Workflow

```
Notes Ready → Extract Action Items → Create Tasks → Track Status → Reminders → Follow-Up Email
```

## 9. Team & Organization Workflow

```
Create Org → Invite Members → Assign Roles → Shared Meetings → Shared Folders → Permissions → Audit Logs
```

## 10. Billing & Subscription Workflow

```
Subscribe → Provider Processes → Webhook → Verify → Update Subscription → Grant Access → Confirm → Renewal → Attempt Charge → Success/Failure → Dunning → Suspend → Win-Back
```

## 11. Support & Incident Workflow

```
Ticket → Auto-Categorize → Priority (P0-P3) → Assign Agent → SLA Response → Resolve → Follow-Up → Close
```

Incident:
```
Alert → On-Call → Severity (SEV1-4) → SEV1/2: Assemble, Status Page, Communicate, Fix, Verify, Post-Mortem → SEV3/4: Log, Schedule, Monitor
```

## 12. Launch & Post-Launch Workflow

Pre-launch: beta testers, feedback system, analytics, support docs, status page, marketing site, pricing page, legal pages.

Launch: soft launch, monitor, respond, fix.

Post-launch: analyze activation, retention, revenue; prioritize; plan next.

## 13. Recommended Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Mobile | React Native + Expo |
| Backend | Node.js + TypeScript |
| API | REST + WebSockets |
| Database | PostgreSQL |
| Cache / Queue | Redis |
| Storage | S3-compatible |
| Auth | OAuth + JWT |
| STT | Whisper / Deepgram / AssemblyAI |
| LLM | OpenAI / Anthropic / Gemini |
| Translation | DeepL / Google Translate |
| Email | Postmark / SendGrid |
| Payments | Stripe + Mobile Money |
| Monitoring | Sentry + Datadog |
| Deployment | Vercel + Railway / Fly.io |

## 14. Project Structure

```
meeting-ai/
├── apps/ (web, mobile, admin, api)
├── packages/ (database, auth, ai, transcription, storage, integrations, notifications, billing, ui, types)
├── infrastructure/
├── docs/
├── tests/
└── README.md
```

## 15. V1 Scope

Phase 1: Account (Google + Email), Home, Start Meeting, Record, Upload/stream, English transcription, Basic AI notes, Action items, Save, Search.

Phase 2: Drive export, Gmail export, PDF/DOCX, Android, iPhone, Offline recording, Multi-language.

Phase 3: Teams, Billing, Advanced AI, Slack/Zoom/Teams integrations, Public API, Enterprise features.

## 16. Critical Metrics

Acquisition: signups/day, source, CPA.
Activation: time to first meeting, completion rate, first note viewed.
Retention: D1/D7/D30, WAU, MAU, churn.
Revenue: MRR, ARR, ARPU, LTV, CAC, LTV:CAC.
Product: meetings/user, minutes/user, AI queries/user, exports/user, share rate.
Quality: STT accuracy, diarization accuracy, AI extraction accuracy, correction rate, processing time.

## 17. Final Notes

1. Accuracy — bad transcription kills everything
2. Speed — users will not wait 10 minutes
3. Trust — privacy and security visible
4. Differentiation — African languages + offline-first
5. Unit economics — do not lose money per user
6. Focus — build one thing well

Risks: building too much before validation; underestimating AI/storage costs; legal issues from recording without consent.

---

# PART 3 — PRODUCTION READINESS SPECIFICATION

## 3.1 Data Model & Persistence

- Data model relationships and constraints
- Database indexes
- Database migration strategy
- Transcript versioning
- Notes versioning
- Soft-delete restoration rules
- Permanent deletion verification
- Data retention enforcement automation
- Legal hold mechanism

## 3.2 API & Security Specification

- API authentication/authorization specification
- Multi-tenant isolation enforcement
- CSRF / CORS / security headers
- Secrets rotation
- Encryption key management
- Key rotation / revocation
- Session / device management
- Login security and account recovery
- Email verification flow details
- Account takeover protection
- Idempotency for critical API operations
- Distributed locking / concurrency handling
- Real-time collaboration conflict resolution

## 3.3 Audit, Privacy & Data Subject Rights

- Audit-log retention policy
- Data-access logging
- DSAR / data-subject request workflow
- Data export implementation
- Consent withdrawal workflow
- Recording consent evidence / audit trail
- Privacy / data-classification model
- Customer data support-access controls
- Admin emergency access / break-glass procedure

## 3.4 Backup, Recovery & Continuity

- Backup restoration testing
- Disaster-recovery failover testing
- RPO / RTO enforcement
- Business continuity ownership
- Operational runbooks
- On-call rotation

## 3.5 Audio, Transcript & Media Handling

- Audio playback / download controls
- Transcript / audio synchronization
- Speaker-label correction persistence
- Upload resumability specification
- Large-file upload limits
- Storage lifecycle policies
- CDN / cache invalidation strategy

## 3.6 AI, STT & Translation Engineering

- AI prompt / version management
- AI model version tracking
- AI evaluation / test dataset
- Automated AI regression testing
- Hallucination evaluation metrics
- STT quality benchmarking
- Translation quality benchmarking
- Language-specific test datasets
- AI provider failover
- STT provider failover
- Translation provider failover

## 3.7 Cost, Quota & Provider Management

- Cost budget alerts
- Per-user / per-organization spending limits
- Provider outage / fallback strategy
- Storage provider failure handling
- Vendor / subprocessor risk management
- Vendor SLA tracking

## 3.8 Queue, Workers & Backpressure

- Queue monitoring dashboard
- Worker autoscaling
- Backpressure handling
- Provider outage fallback

## 3.9 Search & Retrieval Infrastructure

- Search indexing pipeline
- Search index consistency / rebuild strategy
- Vector database architecture
- Permission-aware vector retrieval

## 3.10 Integrations & OAuth

- Integration token encryption / storage
- OAuth token refresh / revocation handling
- Integration reconnect flow
- Integration permission / scope management
- Google OAuth verification requirements
- Integration health monitoring

## 3.11 Mobile Platform Compliance & Behavior

- Apple App Store compliance
- Google Play compliance
- App privacy manifests
- Mobile permission-denial flows
- Mobile microphone interruption recovery
- Background recording recovery
- App update / data migration strategy
- Mobile deep linking
- Universal Links / App Links
- Push notification token lifecycle
- Web push subscription management

## 3.12 Configuration & Release Management

- Feature flags
- Remote configuration
- Environment configuration management
- Product feature-flag rollback
- Release rollback strategy
- Database rollback strategy
- Beta / early-access management
- Product roadmap / versioning

## 3.13 Security Engineering

- CI security scanning
- Dependency vulnerability scanning
- Container / image scanning
- Secret scanning
- Penetration testing
- Security incident notification workflow
- Security threat model
- Abuse investigation tooling

## 3.14 Billing, Payments & Entitlements

- Refund workflow
- Chargeback / dispute handling
- Invoice generation
- Tax invoice requirements
- Subscription cancellation / proration rules
- Plan upgrade / downgrade rules
- Trial expiration workflow
- Payment reconciliation
- Mobile Money webhook reconciliation
- App-store subscription billing
- Feature entitlement system
- Usage-metering accuracy guarantees

## 3.15 Reliability, SLOs & Observability

- SLA monitoring
- SLO / SLI definitions
- Load testing
- Stress testing
- Chaos / failure testing
- End-to-end testing
- Performance budgets

## 3.16 Documentation & Developer Experience

- Documentation for developers
- OpenAPI specification
- API changelog
- Architecture decision records
- Data-flow diagrams

## 3.17 Localization & Accessibility

- Localization / date / time / number formatting tests
- Accessibility testing automation
- WCAG testing

## 3.18 Legal & Content

- Terms for AI-generated content ownership
- Copyright handling for uploaded documents
- Third-party content licensing

## 3.19 User Feedback & Product Process

- User feedback prioritization system
- Product-market validation before full build

## 3.20 Launch Governance

- Production launch checklist
- Rollback checklist
- Post-launch support ownership
- Business KPI dashboard

---

# PART 4 — CRITICAL GAPS (SUMMARY)

## 4.1 Compliance Beyond Privacy Policy
- Call recording consent laws vary by jurisdiction; some require all-party consent
- DPAs with every subprocessor
- EU AI Act risk assessment
- COPPA / GDPR-K if students under 16
- WhatsApp / Telegram recording legal gray area
- Tax / VAT handling globally

## 4.2 Unit Economics
- STT cost per minute
- LLM cost per hour-long transcript (8k–12k tokens; 50k+ with Q&A)
- Storage cost (audio, transcripts, exports, versions)
- Bandwidth cost (streaming chunks)
- Cost-per-user model before pricing

## 4.3 Offline-First Details
- Encryption key management on-device (Keychain / Keystore)
- Conflict resolution offline vs online
- Chunk boundary handling for resumable uploads
- Local DB on mobile (SQLite / Room / Core Data)

## 4.4 Diarization Reality
- Accuracy drops with accents, overlap, code-switching
- No STT provider does perfect diarization
- Speaker enrollment = biometric = GDPR special category
- Fallback UX: manual labeling

## 4.5 Real-Time Translation Limits
- 300ms–2s latency per segment
- Streaming translation is rare
- Code-switching mid-sentence breaks APIs
- Decide: original first or both together

## 4.6 Mobile Background Recording
- iOS: UIBackgroundModes audio + visible indicator
- Android 14+: FOREGROUND_SERVICE_MICROPHONE required
- Samsung/Xiaomi/Tecno kill background apps — whitelist guidance
- Android 10+: no third-party call recording without root
- iOS: no call recording without workaround

## 4.7 Portability
- Full export in usable format
- Import from Otter / Fireflies / Granola
- Account merge (Google + email)

## 4.8 Org Onboarding
- Invite → email → accept → join
- SSO enforcement (SAML / OIDC)
- Domain capture
- Guest access

## 4.9 Search
- Full-text (PostgreSQL tsvector / Meilisearch)
- Semantic (vector embeddings)
- Hybrid
- Permission-aware

## 4.10 Webhooks
- Retry with exponential backoff
- Idempotency keys for payments
- Dead letter queues
- Integration health monitoring

## 4.11 Notifications
- Per-channel preferences
- Digest mode
- Quiet hours
- Grouping

## 4.12 Activation
- Define "aha moment"
- Time-to-first-value
- Drop-off tracking

## 4.13 Moderation
- Reporting mechanism
- Abuse process
- AI-generated content policies

## 4.14 DR & BC
- RPO / RTO targets
- Backup strategy (DB, object versioning, cross-region)
- Incident response plan
- Status page automation

## 4.15 Pricing
- Annual vs monthly
- Seat vs usage-based
- Trial vs freemium
- Grandfathering

## 4.16 Differentiation
- Why not Otter, Fireflies, Granola, Fathom
- Lead with African languages, offline, cross-platform

## 4.17 App Localization
- UI localization (Uganda: English + Swahili, ideally Luganda)

## 4.18 Accessibility
- Screen readers, captions, keyboard, contrast
- WCAG 2.1 AA

## 4.19 API Governance
- Versioning (/v1/, /v2/)
- Rate limit tiers
- Key rotation
- Developer portal

## 4.20 Churn
- Dunning
- Cancellation flow
- Win-back
- Usage-based upgrade prompts

---

*End of document.*


1. Email/Password Authentication
User registration with email validation and password hashing
Secure login with JWT tokens (7-day expiration)
Logout functionality
Authentication middleware for protected routes
2. Google OAuth Integration
Google OAuth 2.0 implementation with proper token management
Account linking to existing users
Automatic profile creation from Google data
OAuth account connection/disconnection
Email verification for Google users
3. User Profile Management
Profile creation during registration
Settings page with personalization options:
Full name, country, timezone
Preferred language (English, Swahili, Luganda, French, Spanish)
Output language for notes
Date/time format preferences
Database schema fixes for proper field lengths
4. Onboarding Flow
Progressive 2-step onboarding:
Use case selection (business, classes, interviews, client meetings, etc.)
Personal information and preferences
Automatic redirect to onboarding for new users
Skip to dashboard for returning users
5. Permissions Request Flow
Step-by-step permission requests:
Microphone access (required for recording)
Notifications (optional, for alerts/reminders)
Calendar integration (optional, for future features)
Graceful handling of permission denials
Skip options for optional permissions
Current Status:
Both servers are running successfully:

API Server: http://localhost:3000 (authentication, profile management, OAuth endpoints)
Web Server: http://localhost:3001 (user interface, onboarding, settings)
📋 Next Steps (According to V1 Scope):
The infrastructure is now ready for the next phase:

Home  (dashboard with recent meetings and tasks)
Start Meeting → Record → Upload/stream → Transcription → English notes → Action items → Save → Search
The authentication and user management foundation is solid, so you can now proceed with implementing the core meeting recording functionality.

