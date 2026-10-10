import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

export interface EmailMessage {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  isConfigured(): boolean;
  send(message: EmailMessage): Promise<void>;
}

export class EmailService implements EmailSender {
  private transporter: Transporter | null = null;

  constructor() {
    if (config.mail.host && config.mail.user && config.mail.password) {
      this.transporter = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        auth: {
          user: config.mail.user,
          pass: config.mail.password,
        },
      });
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email delivery is not configured on this server.');
    }

    await this.transporter.sendMail({
      from: config.mail.from,
      to: message.to.join(', '),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}

export const emailService: EmailService = new EmailService();
