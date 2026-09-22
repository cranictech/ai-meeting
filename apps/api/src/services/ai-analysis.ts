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
}

export class AIAnalysisService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.ai.openaiApiKey });
  }

  async analyzeMeeting(transcript: string): Promise<MeetingAnalysis> {
    const prompt = `Analyze this meeting transcript and extract:
1. A concise summary (2-3 sentences)
2. An executive summary (1 sentence)
3. Key topics discussed
4. Decisions made
5. Action items with assignees and deadlines
6. Outstanding questions

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
  "questions": ["..."]
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes meeting transcripts. Extract only factual information from the transcript. Never hallucinate or invent details.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    return JSON.parse(content);
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
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
  }
}
