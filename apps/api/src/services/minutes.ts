// Deterministic minute formatting using plain string rules.
// No model calls; output is stored as summary.source = 'template'.

export interface MeetingTemplate {
  id: string;
  name: string;
  description: string;
  tier: 'basic' | 'advanced';
  agenda: string;
  objectives: string;
  content: string;
}

// Reusable scaffolds. Free to use; no model call.
export const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: 'business',
    name: 'Business Meeting',
    description: 'General business discussion with decisions and follow-ups.',
    tier: 'basic',
    agenda: '1. Introductions\n2. Review previous actions\n3. Main topics\n4. Decisions\n5. Next steps',
    objectives: '- State the goal of this meeting\n- List what a good outcome looks like',
    content:
      'Summary:\n\n\nDiscussion:\n- \n\nDecisions:\n- \n\nAction items:\n- [ ]  @  by YYYY-MM-DD\n\nRisks:\n- \n\nFollow-ups:\n- ',
  },
  {
    id: 'team',
    name: 'Team Meeting',
    description: 'Recurring team sync: updates, blockers, actions.',
    tier: 'basic',
    agenda: '1. Wins since last sync\n2. Current work\n3. Blockers\n4. Priorities for this week',
    objectives: '- Align the team on priorities\n- Surface and unblock issues',
    content:
      'Discussion:\n- \n\nDecisions:\n- \n\nAction items:\n- [ ]  @  by YYYY-MM-DD\n\nFollow-ups:\n- ',
  },
  {
    id: 'client',
    name: 'Client Meeting',
    description: 'Client or customer call with agreed outcomes.',
    tier: 'basic',
    agenda: '1. Client goals\n2. Current status\n3. Open issues\n4. Agreement and next steps',
    objectives: '- Understand the client need\n- Agree deliverables and dates',
    content:
      'Summary:\n\n\nDiscussion:\n- \n\nDecisions:\n- \n\nAction items:\n- [ ]  @  by YYYY-MM-DD\n',
  },
  {
    id: 'project',
    name: 'Project Meeting',
    description: 'Project status, scope, risks, and tasks.',
    tier: 'basic',
    agenda: '1. Milestones vs plan\n2. Scope changes\n3. Risks\n4. Task assignments',
    objectives: '- Track progress against plan\n- Assign owners for next steps',
    content:
      'Discussion:\n- \n\nDecisions:\n- \n\nRisks:\n- \n\nAction items:\n- [ ]  @  by YYYY-MM-DD\n',
  },
  {
    id: 'interview',
    name: 'Interview',
    description: 'Candidate or research interview notes.',
    tier: 'basic',
    agenda: '1. Background\n2. Questions\n3. Observations\n4. Evaluation',
    objectives: '- Capture relevant answers\n- Record an objective evaluation',
    content:
      'Summary:\n\n\nDiscussion:\n- \n\nQuestions:\n- \n\nFollow-ups:\n- ',
  },
  {
    id: 'class',
    name: 'Class / Lecture',
    description: 'Class or lecture key points and takeaways.',
    tier: 'basic',
    agenda: '1. Topic\n2. Key points\n3. Examples\n4. Assignments',
    objectives: '- Record what was taught\n- Note assignments and deadlines',
    content:
      'Summary:\n\n\nDiscussion:\n- \n\nAction items:\n- [ ]  by YYYY-MM-DD\n',
  },
];

export interface StructuredMinutes {
  executiveSummary: string;
  summary: string;
  discussion: string[];
  decisions: string[];
  actionItems: Array<{ task: string; assignee?: string; dueDate?: string }>;
  risks: string[];
  followUps: string[];
  questions: string[];
  markdown: string;
}

// Map a written header line (lowercased) to a section name.
function classifyHeader(line: string): keyof StructuredMinutes | null {
  const h = line.toLowerCase().replace(/:.*$/, '').trim();
  if (/^(summary|overview|recap)$/.test(h)) return 'summary';
  if (/^(discussion|notes|body|points|key points|takeaways)$/.test(h)) return 'discussion';
  if (/^(decisions?|agreements?|outcomes?)$/.test(h)) return 'decisions';
  if (/^(action items?|actions?|tasks?|todos?)$/.test(h)) return 'actionItems';
  if (/^(risks?|concerns?|issues?|blockers?)$/.test(h)) return 'risks';
  if (/^(follow[- ]?ups?|next steps?)$/.test(h)) return 'followUps';
  if (/^(questions?)$/.test(h)) return 'questions';
  return null;
}

const BULLET = /^[-*•]\s+(.*)$/;
const CHECKBOX = /^\[[ xX]\]\s+(.*)$/;

// Parse "@name" and "by/due <date>" out of an action-item line.
function parseActionItem(raw: string) {
  let task = raw;
  let assignee: string | undefined;
  let dueDate: string | undefined;

  const assigneeMatch = task.match(/@([\w.\- ]+?)(?=\s+(?:by|due)\b|\s*$)/);
  if (assigneeMatch) {
    assignee = assigneeMatch[1].trim();
    task = task.replace(assigneeMatch[0], '').trim();
  }
  const dateMatch = task.match(/\b(?:by|due)\s+([0-9]{4}-[0-9]{2}-[0-9]{2})\b/i);
  if (dateMatch) {
    dueDate = dateMatch[1];
    task = task.replace(dateMatch[0], '').trim();
  }
  return { task: task.replace(/\s+/g, ' ').replace(/[:\-]\s*$/, '').trim(), assignee, dueDate };
}

export function formatMinutesDeterministically(input: {
  content: string;
  agenda: string;
  objectives: string;
  title: string;
  meetingDate?: Date | string | null;
}): StructuredMinutes {
  const result: StructuredMinutes = {
    executiveSummary: '',
    summary: '',
    discussion: [],
    decisions: [],
    actionItems: [],
    risks: [],
    followUps: [],
    questions: [],
    markdown: '',
  };

  const lines = (input.content || '').split(/\r?\n/);
  let current: keyof StructuredMinutes | null = null;
  let sawAnyHeader = false;

  for (const line of lines) {
    const header = classifyHeader(line);
    if (header) {
      current = header;
      sawAnyHeader = true;
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    const bulletMatch = trimmed.match(BULLET) || trimmed.match(CHECKBOX);

    if (current === 'actionItems') {
      if (bulletMatch) {
        result.actionItems.push(parseActionItem(bulletMatch[1]));
      } else if (trimmed.length > 0) {
        result.actionItems.push(parseActionItem(trimmed));
      }
      continue;
    }

    // Action-item checkbox syntax is recognized anywhere, not just under a header.
    if (!current && trimmed.match(CHECKBOX)) {
      result.actionItems.push(parseActionItem(trimmed.match(CHECKBOX)![1]));
      continue;
    }

    const text = bulletMatch ? bulletMatch[1] : trimmed;
    switch (current) {
      case 'summary':
        result.summary += (result.summary ? ' ' : '') + text;
        break;
      case 'discussion':
        result.discussion.push(text);
        break;
      case 'decisions':
        result.decisions.push(text);
        break;
      case 'risks':
        result.risks.push(text);
        break;
      case 'followUps':
        result.followUps.push(text);
        break;
      case 'questions':
        result.questions.push(text);
        break;
      default:
        // Unlabeled content: fill discussion (or summary if nothing yet).
        if (result.discussion.length === 0 && !result.summary && !sawAnyHeader) {
          result.summary += (result.summary ? ' ' : '') + text;
        } else {
          result.discussion.push(text);
        }
    }
  }

  // Derive a one-line executive summary deterministically.
  const first =
    result.summary ||
    result.discussion[0] ||
    (result.actionItems[0] && `Agreed ${result.actionItems.length} action item(s).`) ||
    '';
  result.executiveSummary = first.length > 160 ? first.slice(0, 157).trim() + '...' : first;

  result.markdown = buildMinutesMarkdown(input, result);
  return result;
}

function buildMinutesMarkdown(
  input: { title: string; meetingDate?: Date | string | null; agenda: string; objectives: string },
  m: StructuredMinutes
): string {
  const out: string[] = [];
  if (m.summary) out.push(`**Summary:** ${m.summary}`);
  if (input.objectives) out.push(`**Objectives:** ${input.objectives.replace(/\n+/g, '; ')}`);

  if (m.discussion.length) {
    out.push('\n**Discussion**');
    m.discussion.forEach((d) => out.push(`- ${d}`));
  }
  if (m.decisions.length) {
    out.push('\n**Decisions**');
    m.decisions.forEach((d) => out.push(`- ${d}`));
  }
  if (m.actionItems.length) {
    out.push('\n**Action items**');
    m.actionItems.forEach((a) => {
      const parts = [`- ${a.task}`];
      if (a.assignee) parts.push(`→ ${a.assignee}`);
      if (a.dueDate) parts.push(`(due ${a.dueDate})`);
      out.push(parts.join(' '));
    });
  }
  if (m.risks.length) {
    out.push('\n**Risks / concerns**');
    m.risks.forEach((r) => out.push(`- ${r}`));
  }
  if (m.followUps.length) {
    out.push('\n**Follow-ups**');
    m.followUps.forEach((f) => out.push(`- ${f}`));
  }
  if (m.questions.length) {
    out.push('\n**Questions**');
    m.questions.forEach((q) => out.push(`- ${q}`));
  }

  if (out.length === 0) out.push('_No structured content could be detected from the notes._');
  return out.join('\n').trim();
}
