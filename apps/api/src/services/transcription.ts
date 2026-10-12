import OpenAI from 'openai';
import { config } from '../config';
import * as fs from 'fs';

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

export interface SpeechTranscriber {
  transcribe(audioPath: string, language?: string): Promise<TranscriptionResult>;
}

export interface LanguageDetector {
  detectLanguage(audioPath: string): Promise<string>;
}

export interface ITranscriptionService extends SpeechTranscriber, LanguageDetector {}

export class TranscriptionService implements ITranscriptionService {
  private openai: OpenAI | null = null;

  constructor() {
    if (config.ai.openaiApiKey && config.ai.openaiApiKey.trim().length > 0) {
      this.openai = new OpenAI({ apiKey: config.ai.openaiApiKey });
    }
  }

  async transcribe(audioPath: string, language?: string): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error(
        'Speech-to-text is not configured. Set OPENAI_API_KEY to enable transcription.',
      );
    }
    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio recording not found for this meeting.');
    }

    const fileStream = fs.createReadStream(audioPath);
    const file = await this.openai.audio.transcriptions.create({
      file: fileStream as any,
      model: config.ai.transcriptionModel,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      // Only force a language when the user explicitly chose one; otherwise
      // fall back to the provider's automatic detection.
      ...(language && language !== 'auto' ? { language } : {}),
    });

    const segments = (file as any).segments?.length
      ? (file as any).segments.map((s: any) => ({
          start: Math.round(s.start * 100) / 100,
          end: Math.round(s.end * 100) / 100,
          text: s.text.trim(),
          speaker: 'Speaker 1',
        }))
      : [
          {
            start: 0,
            end: Math.round(((file as any).duration || 0) * 100) / 100,
            text: file.text.trim(),
            speaker: 'Speaker 1',
          },
        ];

    return {
      text: file.text,
      language: file.language || 'en',
      segments,
    };
  }

  async detectLanguage(audioPath: string): Promise<string> {
    const result = await this.transcribe(audioPath);
    return result.language || 'en';
  }
}

