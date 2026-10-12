import OpenAI from 'openai';
import { config } from '../config';

export interface MeetingAnalysis {
  summary: string;
  executiveSummary: string;
  topics: string[];
  decisions: Array<{
    decision: string;
    timestamp?: number;
  }>;
  actionItems: Array<{
    task: string;
    assignee?: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  questions: string[];
  risks: string[];
  followUps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  keyPoints: string[];
}

export interface MeetingAnalyzer {
  analyzeMeeting(transcript: string, meetingType?: string, meetingTitle?: string): Promise<MeetingAnalysis>;
}

export interface TextTranslator {
  translate(text: string, targetLanguage: string): Promise<string>;
}

export interface IAnalysisService extends MeetingAnalyzer, TextTranslator {}

export class AnalysisService implements IAnalysisService {
  private openai: OpenAI | null = null;

  constructor() {
    if (config.ai.openaiApiKey && config.ai.openaiApiKey.trim().length > 0) {
      this.openai = new OpenAI({ apiKey: config.ai.openaiApiKey });
    }
  }

  async analyzeMeeting(transcript: string, meetingType?: string, meetingTitle?: string): Promise<MeetingAnalysis> {
    if (this.openai && transcript.trim().length > 0) {
      const prompt = `Analyze this meeting transcript and extract:
1. A concise summary (2-3 sentences)
2. An executive summary (1 sentence)
3. Key topics discussed
4. Decisions made
5. Action items with assignees and deadlines
6. Outstanding questions
7. Risks and concerns identified
8. Follow-up actions needed
9. Overall sentiment (positive, neutral, negative)
10. Key points or takeaways

IMPORTANT: Only extract information explicitly stated in the transcript. Do not invent or assume information.

Transcript:
${transcript}

Respond in JSON format:
{
  "summary": "...",
  "executiveSummary": "...",
  "topics": ["..."],
  "decisions": [{"decision": "...", "timestamp": 123}],
  "actionItems": [{"task": "...", "assignee": "...", "dueDate": "...", "priority": "medium"}],
  "questions": ["..."],
  "risks": ["..."],
  "followUps": ["..."],
  "sentiment": "positive|neutral|negative",
  "keyPoints": ["..."]
}`;

      // Try the configured primary model, then the fallback. Every failure is
      // logged with an [AI-ALERT] tag so it can be routed to monitoring.
      for (const model of [config.ai.analysisModel, config.ai.analysisFallbackModel]) {
        try {
          const response = await this.openai.chat.completions.create({
            model,
            messages: [
              {
                role: 'system',
                content: 'You are an assistant that analyzes meeting transcripts. Extract only factual information from the transcript. Never hallucinate or invent details.',
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });

          const content = response.choices[0].message.content;
          if (content) {
            return JSON.parse(content);
          }
        } catch (err) {
          console.error(`[AI-ALERT] analysis model "${model}" failed:`, err);
        }
      }
    }

    return this.heuristicAnalysis(transcript, meetingType, meetingTitle);
  }

  private heuristicAnalysis(transcript: string, meetingType?: string, meetingTitle?: string): MeetingAnalysis {
    const sentences = transcript
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const actionItems: MeetingAnalysis['actionItems'] = [];
    const decisions: MeetingAnalysis['decisions'] = [];
    const topics: string[] = [];
    const questions: string[] = [];
    const risks: string[] = [];
    const followUps: string[] = [];
    const keyPoints: string[] = [];

    // Keywords for tasks
    const taskTriggers = ['will', 'need to', 'must', 'action', 'follow up', 'assigned', 'task', 'prepare', 'review', 'deliver', 'send', 'schedule'];
    // Keywords for decisions
    const decisionTriggers = ['decided', 'agreed', 'approved', 'confirmed', 'chosen', 'conclusion', 'resolved'];
    // Keywords for risks
    const riskTriggers = ['risk', 'concern', 'issue', 'problem', 'challenge', 'obstacle', 'worried', 'uncertain'];
    // Keywords for follow-ups
    const followUpTriggers = ['follow up', 'check in', 'next time', 'schedule', 'meet again', 'revisit'];

    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();

      if (sentence.endsWith('?')) {
        questions.push(sentence);
      }

      if (decisionTriggers.some(t => lower.includes(t))) {
        decisions.push({
          decision: sentence.replace(/^[A-Z][a-z]+ \d+:\s*/, ''),
        });
      } else if (taskTriggers.some(t => lower.includes(t))) {
        let assignee: string | undefined;
        if (lower.includes('speaker 1')) assignee = 'Speaker 1';
        else if (lower.includes('speaker 2')) assignee = 'Speaker 2';

        actionItems.push({
          task: sentence.replace(/^[A-Z][a-z]+ \d+:\s*/, ''),
          assignee,
          priority: lower.includes('urgent') || lower.includes('must') ? 'high' : 'medium',
        });
      }

      if (riskTriggers.some(t => lower.includes(t))) {
        risks.push(sentence);
      }

      if (followUpTriggers.some(t => lower.includes(t))) {
        followUps.push(sentence);
      }
    });

    const summary = sentences.length > 0
      ? sentences.slice(0, 3).join(' ')
      : '';

    const executiveSummary = sentences.length > 0
      ? sentences[0]
      : '';

    // Simple sentiment analysis
    const negativeWords = ['problem', 'issue', 'failed', 'delay', 'concern', 'risk', 'worried'];
    const positiveWords = ['success', 'great', 'excellent', 'achieved', 'completed', 'approved', 'agreed'];
    const lowerTranscript = transcript.toLowerCase();
    const negativeCount = negativeWords.filter(w => lowerTranscript.includes(w)).length;
    const positiveCount = positiveWords.filter(w => lowerTranscript.includes(w)).length;
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    if (negativeCount > positiveCount) sentiment = 'negative';

    return {
      summary,
      executiveSummary,
      topics,
      decisions,
      actionItems,
      questions,
      risks,
      followUps,
      sentiment,
      keyPoints,
    };
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    if (this.openai) {
      for (const model of [config.ai.analysisModel, config.ai.analysisFallbackModel]) {
        try {
          const response = await this.openai.chat.completions.create({
            model,
            messages: [
              {
                role: 'system',
                content: `Translate the following text to ${targetLanguage}. Maintain the meaning and tone.`,
              },
              { role: 'user', content: text },
            ],
            temperature: 0.3,
          });

          return response.choices[0].message.content || text;
        } catch (err) {
          console.error(`[AI-ALERT] translation model "${model}" failed:`, err);
        }
      }
    }
    return text;
  }
}
