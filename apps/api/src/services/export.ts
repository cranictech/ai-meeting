import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export class ExportService {
  async generatePDF(meeting: any, summary: any, decisions: any[], actionItems: any[], transcript: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(24).font('Helvetica-Bold').text(meeting.title || 'Meeting Notes', { align: 'center' });
        doc.moveDown();

        // Metadata
        doc.fontSize(10).font('Helvetica').text(`Date: ${new Date(meeting.created_at || Date.now()).toLocaleDateString()}`);
        doc.text(`Duration: ${Math.round((meeting.duration_seconds || 0) / 60)} minutes`);
        doc.text(`Status: ${meeting.status || 'Completed'}`);
        doc.moveDown();

        // Executive Summary
        if (summary?.executive_summary) {
          doc.fontSize(14).font('Helvetica-Bold').text('Executive Summary');
          doc.moveDown(0.5);
          doc.fontSize(11).font('Helvetica').text(summary.executive_summary);
          doc.moveDown();
        }

        // Summary
        if (summary?.summary) {
          doc.fontSize(14).font('Helvetica-Bold').text('Summary');
          doc.moveDown(0.5);
          doc.fontSize(11).font('Helvetica').text(summary.summary);
          doc.moveDown();
        }

        // Decisions
        if (decisions && decisions.length > 0) {
          doc.fontSize(14).font('Helvetica-Bold').text('Key Decisions');
          doc.moveDown(0.5);
          decisions.forEach((decision) => {
            doc.fontSize(11).font('Helvetica').text(`- ${decision.decision}`);
          });
          doc.moveDown();
        }

        // Action Items
        if (actionItems && actionItems.length > 0) {
          doc.fontSize(14).font('Helvetica-Bold').text('Action Items');
          doc.moveDown(0.5);
          actionItems.forEach((item) => {
            const status = item.status === 'completed' ? '[done]' : '[ ]';
            const assignee = item.assignee ? ` (${item.assignee})` : '';
            const due = item.due_date ? ` - Due: ${item.due_date}` : '';
            doc.fontSize(11).font('Helvetica').text(`${status} ${item.task}${assignee}${due}`);
          });
          doc.moveDown();
        }

        // Transcript
        if (transcript && transcript.length > 0) {
          doc.fontSize(14).font('Helvetica-Bold').text('Transcript');
          doc.moveDown(0.5);
          transcript.forEach((segment) => {
            const time = this.formatTime(segment.start_time);
            const speaker = segment.speaker || 'Speaker';
            doc.fontSize(10).font('Helvetica').text(`[${time}] ${speaker}: ${segment.text}`);
            doc.moveDown(0.3);
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateDOCX(meeting: any, summary: any, decisions: any[], actionItems: any[], transcript: any[]): Promise<Buffer> {
    try {
      const children: any[] = [];

      // Title
      children.push(
        new Paragraph({
          text: meeting.title || 'Meeting Notes',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );

      // Metadata
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Date: ', bold: true }),
            new TextRun(new Date(meeting.created_at || Date.now()).toLocaleDateString()),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Duration: ', bold: true }),
            new TextRun(`${Math.round((meeting.duration_seconds || 0) / 60)} minutes`),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Status: ', bold: true }),
            new TextRun(meeting.status || 'Completed'),
          ],
          spacing: { after: 400 },
        })
      );

      // Executive Summary
      if (summary?.executive_summary) {
        children.push(
          new Paragraph({
            text: 'Executive Summary',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: summary.executive_summary,
            spacing: { after: 400 },
          })
        );
      }

      // Summary
      if (summary?.summary) {
        children.push(
          new Paragraph({
            text: 'Summary',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: summary.summary,
            spacing: { after: 400 },
          })
        );
      }

      // Decisions
      if (decisions && decisions.length > 0) {
        children.push(
          new Paragraph({
            text: 'Key Decisions',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          })
        );
        decisions.forEach((decision) => {
          children.push(
            new Paragraph({
              text: `- ${decision.decision}`,
              bullet: { level: 0 },
              spacing: { after: 100 },
            })
          );
        });
        children.push(new Paragraph({ text: '', spacing: { after: 400 } }));
      }

      // Action Items
      if (actionItems && actionItems.length > 0) {
        children.push(
          new Paragraph({
            text: 'Action Items',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          })
        );
        actionItems.forEach((item) => {
          const status = item.status === 'completed' ? '[done]' : '[ ]';
          const assignee = item.assignee ? ` (${item.assignee})` : '';
          const due = item.due_date ? ` - Due: ${item.due_date}` : '';
          children.push(
            new Paragraph({
              text: `${status} ${item.task}${assignee}${due}`,
              bullet: { level: 0 },
              spacing: { after: 100 },
            })
          );
        });
        children.push(new Paragraph({ text: '', spacing: { after: 400 } }));
      }

      // Transcript
      if (transcript && transcript.length > 0) {
        children.push(
          new Paragraph({
            text: 'Transcript',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          })
        );
        transcript.forEach((segment) => {
          const time = this.formatTime(segment.start_time);
          const speaker = segment.speaker || 'Speaker';
          children.push(
            new Paragraph({
              text: `[${time}] ${speaker}: ${segment.text}`,
              spacing: { after: 100 },
            })
          );
        });
      }

      const doc = new Document({
        sections: [{ children }],
      });

      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (error) {
      throw new Error(`Failed to generate DOCX: ${error}`);
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
