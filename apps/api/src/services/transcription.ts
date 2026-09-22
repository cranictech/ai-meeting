import OpenAI from 'openai';
import { config } from '../config';

export interface TranscriptionResult {
  text: string;
  language?: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }>;
}

export class TranscriptionService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.ai.openaiApiKey });
  }

  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    // In production, read from storage
    const file = await this.openai.audio.transcriptions.create({
      file: await fetch(audioPath).then(r => r.blob()) as any,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    return {
      text: file.text,
      language: file.language,
      segments: (file as any).segments?.map((s: any) => ({
        start: s.start,
        end: s.end,
        text: s.text,
      })) || [],
    };
  }

  async detectLanguage(audioPath: string): Promise<string> {
    const result = await this.transcribe(audioPath);
    return result.language || 'en';
  }
}
