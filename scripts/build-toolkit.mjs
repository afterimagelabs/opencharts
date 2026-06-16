import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public', 'toolkit');
mkdirSync(PUBLIC_DIR, { recursive: true });

const INK = rgb(0.08, 0.09, 0.10);
const MUTED = rgb(0.35, 0.37, 0.41);
const SEAL = rgb(0.48, 0.12, 0.12);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_L = 72;
const MARGIN_R = 72;
const MARGIN_T = 72;
const TEXT_W = PAGE_W - MARGIN_L - MARGIN_R;

function wrap(text, font, size, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];
  for (const p of paragraphs) {
    if (!p.trim()) {
      lines.push('');
      continue;
    }
    const words = p.split(/\s+/);
    let current = '';
    for (const w of words) {
      const trial = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
        current = trial;
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

class Writer {
  constructor(doc, fonts) {
    this.doc = doc;
    this.fonts = fonts;
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN_T;
  }
  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN_T;
  }
  space(px) {
    this.y -= px;
    if (this.y < 80) this.newPage();
  }
  text(text, { font = this.fonts.serif, size = 11, color = INK, indent = 0, leading = 1.45 } = {}) {
    const lines = wrap(text, font, size, TEXT_W - indent);
    const lineHeight = size * leading;
    for (const line of lines) {
      if (this.y < 80) this.newPage();
      this.page.drawText(line, {
        x: MARGIN_L + indent,
        y: this.y - size,
        font,
        size,
        color,
      });
      this.y -= lineHeight;
    }
  }
  heading(text, size = 14) {
    this.space(4);
    this.text(text, { font: this.fonts.serifBold, size, color: INK });
    this.space(4);
  }
  rule({ color = MUTED, dashed = false } = {}) {
    if (this.y < 80) this.newPage();
    if (dashed) {
      let x = MARGIN_L;
      while (x < MARGIN_L + TEXT_W) {
        this.page.drawLine({
          start: { x, y: this.y },
          end: { x: Math.min(x + 4, MARGIN_L + TEXT_W), y: this.y },
          thickness: 0.5,
          color,
        });
        x += 8;
      }
    } else {
      this.page.drawLine({
        start: { x: MARGIN_L, y: this.y },
        end: { x: MARGIN_L + TEXT_W, y: this.y },
        thickness: 0.5,
        color,
      });
    }
    this.y -= 6;
  }
  fillLine(label, lineLength = TEXT_W * 0.55) {
    if (this.y < 80) this.newPage();
    const size = 11;
    const labelW = this.fonts.serif.widthOfTextAtSize(label, size);
    this.page.drawText(label, {
      x: MARGIN_L,
      y: this.y - size,
      font: this.fonts.serif,
      size,
      color: INK,
    });
    this.page.drawLine({
      start: { x: MARGIN_L + labelW + 6, y: this.y - size },
      end: { x: MARGIN_L + labelW + 6 + lineLength, y: this.y - size },
      thickness: 0.6,
      color: MUTED,
    });
    this.y -= size * 1.7;
  }
  checkbox(label) {
    if (this.y < 80) this.newPage();
    const size = 11;
    const boxSize = 9;
    const yBox = this.y - boxSize - 2;
    this.page.drawRectangle({
      x: MARGIN_L,
      y: yBox,
      width: boxSize,
      height: boxSize,
      borderColor: INK,
      borderWidth: 0.8,
    });
    this.page.drawText(label, {
      x: MARGIN_L + boxSize + 6,
      y: this.y - size,
      font: this.fonts.serif,
      size,
      color: INK,
    });
    this.y -= size * 1.7;
  }
  header(title, subtitle) {
    this.page.drawText('OPENCHARTS', {
      x: MARGIN_L,
      y: PAGE_H - 50,
      font: this.fonts.sansBold,
      size: 9,
      color: SEAL,
    });
    const subW = this.fonts.sans.widthOfTextAtSize(subtitle, 9);
    this.page.drawText(subtitle, {
      x: MARGIN_L + TEXT_W - subW,
      y: PAGE_H - 50,
      font: this.fonts.sans,
      size: 9,
      color: MUTED,
    });
    this.page.drawLine({
      start: { x: MARGIN_L, y: PAGE_H - 56 },
      end: { x: MARGIN_L + TEXT_W, y: PAGE_H - 56 },
      thickness: 0.5,
      color: INK,
    });
    this.y = PAGE_H - 90;
    this.text(title, { font: this.fonts.serifBold, size: 22 });
    this.space(6);
  }
  footer(text) {
    const size = 8;
    const w = this.fonts.sans.widthOfTextAtSize(text, size);
    this.page.drawText(text, {
      x: MARGIN_L + (TEXT_W - w) / 2,
      y: 50,
      font: this.fonts.sans,
      size,
      color: MUTED,
    });
  }
}

async function buildLetter() {
  const doc = await PDFDocument.create();
  const fonts = {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const w = new Writer(doc, fonts);
  w.header('Medical Records Request', 'A patient template under 45 C.F.R. § 164.524');

  w.text(
    'This letter is the OpenCharts template for requesting a copy of your medical records under your right of access under the HIPAA Privacy Rule. Fill in the blanks, sign it, and send it by USPS certified mail (return receipt requested) or by your provider\'s patient portal. Keep a copy and the proof of delivery.',
    { font: fonts.serif, size: 10, color: MUTED, leading: 1.45 }
  );
  w.space(10);
  w.rule({ color: MUTED });

  w.space(14);
  w.heading('Your information', 13);
  w.fillLine('Full name:');
  w.fillLine('Date of birth:');
  w.fillLine('Mailing address:');
  w.fillLine('Phone:');
  w.fillLine('Email:');

  w.space(8);
  w.heading('Provider', 13);
  w.fillLine('Practice or hospital name:');
  w.fillLine('Medical records department address:');
  w.fillLine('Date of this request:');

  w.space(12);
  w.rule({ color: MUTED, dashed: true });
  w.space(10);

  w.text('VIA USPS CERTIFIED MAIL — RETURN RECEIPT REQUESTED', {
    font: fonts.sansBold,
    size: 9,
    color: SEAL,
  });
  w.space(8);
  w.text('Re: Request for medical records under 45 C.F.R. § 164.524', {
    font: fonts.serifBold,
    size: 11,
  });
  w.space(12);

  w.text('To the Medical Records Department,', { size: 11 });
  w.space(6);
  w.text(
    'I am writing to request a copy of my medical records under the right of access provided by the HIPAA Privacy Rule, codified at 45 C.F.R. § 164.524.'
  );
  w.space(8);

  w.heading('Records requested', 12);
  w.checkbox('All records in my file.');
  w.checkbox('Records for the date range:');
  w.fillLine('Date range:', TEXT_W * 0.45);
  w.checkbox('Specific items only (please list below):');
  w.fillLine('Items:', TEXT_W * 0.7);

  w.space(6);
  w.heading('Format', 12);
  w.text(
    'Under 45 C.F.R. § 164.524(c)(2)(ii), if my records are kept electronically, I have the right to receive them in an electronic form and format of my choice, provided the format is readily producible.',
    { size: 10, color: MUTED }
  );
  w.space(4);
  w.checkbox('Electronic copy (PDF or other readily producible format) sent to:');
  w.fillLine('  Email:', TEXT_W * 0.6);
  w.fillLine('  Patient portal:', TEXT_W * 0.5);
  w.checkbox('Paper copy mailed to the address above.');

  w.space(6);
  w.heading('Deadline (30 days)', 12);
  w.text(
    'Under 45 C.F.R. § 164.524(b)(2)(i), you must act on this request no later than thirty (30) days after its receipt. If you require an extension, the regulation requires you to notify me in writing within those first 30 days and to state the reason for the delay. You may extend only once, by up to thirty (30) additional days.'
  );
  w.space(6);

  w.heading('Fees', 12);
  w.text(
    'Under 45 C.F.R. § 164.524(c)(4), any fee you charge must be reasonable and cost-based. I do not consent to fees for searching for or retrieving my records, and I do not consent to a per-page rate that exceeds your actual cost. Please itemize any charges before processing payment.'
  );
  w.space(8);

  w.text(
    'Please confirm receipt of this request, the date you received it, and the date by which I should expect the records.'
  );
  w.space(14);
  w.text('Sincerely,', { size: 11 });
  w.space(36);
  w.rule({ color: INK });
  w.text('Signature', { font: fonts.sans, size: 9, color: MUTED });
  w.space(20);
  w.fillLine('Printed name:');
  w.fillLine('Date:');

  w.space(20);
  w.rule({ color: MUTED, dashed: true });
  w.space(8);
  w.text(
    'cc: Personal records. Keep this letter, the USPS certified-mail receipt, and any tracking confirmation in your OpenCharts audit log.',
    { font: fonts.serifItalic, size: 9, color: MUTED }
  );

  w.footer(
    'OpenCharts · opencharts.org · MIT-licensed template · Not legal advice'
  );

  const bytes = await doc.save();
  writeFileSync(join(PUBLIC_DIR, 'records-request.pdf'), bytes);
  console.log('  ✓ toolkit/records-request.pdf');
}

async function buildComplaintGuide() {
  const doc = await PDFDocument.create();
  const fonts = {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
  const w = new Writer(doc, fonts);
  w.header('HHS OCR Complaint', 'When the 30-day deadline passes and the records have not arrived');

  w.text(
    'When you reach Day 31 with no records and no written extension, you can file a complaint with the U.S. Department of Health and Human Services Office for Civil Rights. The form is online and free. This guide tells you what to have ready before you open it.',
    { color: MUTED, size: 10 }
  );
  w.space(10);
  w.rule({ color: MUTED });

  w.space(12);
  w.heading('Where to file', 13);
  w.text('Online (the fastest path):', { size: 11 });
  w.text('   ocrportal.hhs.gov/ocr/smartscreen/main.jsf', {
    font: fonts.mono,
    size: 10,
    color: SEAL,
  });
  w.space(4);
  w.text('Or by mail to your regional OCR office:', { size: 11 });
  w.text('   www.hhs.gov/ocr/office/about/rgn-hqaddresses.html', {
    font: fonts.mono,
    size: 10,
    color: SEAL,
  });

  w.space(10);
  w.heading('What to have ready', 13);
  w.text('Before you start the form, gather the following from your OpenCharts audit log:', {
    size: 11,
  });
  w.space(6);
  const items = [
    '1. Your name, mailing address, phone, and email.',
    '2. The provider\'s legal name and address.',
    '3. The date you sent your records request (Day 0).',
    '4. The proof of delivery (USPS certified-mail tracking number or portal receipt).',
    '5. The dates of every follow-up contact and what was said.',
    '6. The date the 30-day deadline expired.',
    '7. Whether you received a written extension and, if so, when.',
    '8. A statement of what you were asking for (records type and format).',
  ];
  for (const it of items) {
    w.text(it, { size: 11, indent: 16 });
    w.space(2);
  }

  w.space(8);
  w.heading('What to write in the summary box', 13);
  w.text(
    'The OCR form has a free-text field for the summary of your complaint. A template that fits the 30-day-access category:',
    { size: 11 }
  );
  w.space(6);
  w.text(
    'On [DATE], I sent a written request to [PROVIDER] for a copy of my medical records under the HIPAA right of access, 45 C.F.R. § 164.524. The request was delivered on [DATE] (USPS tracking [#]). I followed up on [DATE] and [DATE]. As of [DATE], more than 30 days after delivery, I have received neither the records nor a written extension notice. I am filing this complaint under 45 C.F.R. § 164.524(b)(2)(i).',
    { font: fonts.serifItalic, size: 10.5, color: INK, leading: 1.55 }
  );

  w.space(10);
  w.heading('What to attach', 13);
  const attach = [
    'Your records request letter (the one OpenCharts generates).',
    'The USPS certified-mail receipt and tracking history.',
    'A printout or export of your OpenCharts audit log.',
    'Any written extension notice (or a note that none was received).',
    'Any provider response or denial.',
  ];
  for (const a of attach) {
    w.text(`•  ${a}`, { size: 11, indent: 16 });
    w.space(2);
  }

  w.space(10);
  w.heading('After you file', 13);
  w.text(
    'OCR will send a confirmation. From there, processing times vary, sometimes substantially. OCR may contact the provider for a response, request more documentation from you, or close the complaint with a finding. You can file in parallel with any state health-department complaint your state offers.'
  );
  w.space(10);
  w.text(
    'Nothing in this guide is legal advice. For your specific situation, talk to an attorney.',
    { font: fonts.serifItalic, size: 9.5, color: MUTED }
  );

  w.footer('OpenCharts · opencharts.org · MIT-licensed guide · Not legal advice');

  const bytes = await doc.save();
  writeFileSync(join(PUBLIC_DIR, 'ocr-complaint-guide.pdf'), bytes);
  console.log('  ✓ toolkit/ocr-complaint-guide.pdf');
}

function buildLog() {
  const header = [
    'Day',
    'Date',
    'Time',
    'Type',
    'Direction',
    'Contact Name/Role',
    'Subject',
    'Notes',
    'Promised Action',
    'Next Follow-Up',
  ];
  const sample = [
    [
      '0',
      '2026-04-03',
      '09:14',
      'Letter',
      'Outbound',
      'Medical Records Dept',
      'Records request sent',
      'USPS certified #7019 1640 0000 4523 8814',
      'N/A',
      'Confirm delivery via tracking',
    ],
    [
      '2',
      '2026-04-05',
      '13:02',
      'USPS tracking',
      'Inbound',
      'N/A',
      'Delivery confirmed',
      'Signed by J. Ramirez at front desk',
      'Records dept to begin processing',
      'Day 14',
    ],
    [
      '14',
      '2026-04-17',
      '10:30',
      'Phone',
      'Outbound',
      'K. Patel (records clerk)',
      'First follow-up',
      'Spoke ~3 min. Told "still processing."',
      'Will follow up by EOW',
      'Day 23',
    ],
    [
      '23',
      '2026-04-26',
      '16:48',
      'Email',
      'Outbound',
      'records@example.org',
      'Second follow-up',
      'No response within 72h',
      '',
      'Day 30',
    ],
    [
      '30',
      '2026-05-03',
      '23:59',
      'Deadline',
      'N/A',
      'N/A',
      '30-day deadline',
      'No records and no written extension received',
      '',
      'Day 31',
    ],
    [
      '31',
      '2026-05-04',
      '00:00',
      'Complaint',
      'Outbound',
      'HHS OCR',
      'Complaint filed',
      'OCR confirmation #...',
      '',
      '',
    ],
    [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Add your own rows here. Delete the sample rows above first.',
      '',
      '',
    ],
  ];
  const csv =
    [header, ...sample]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '');
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
              return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
          })
          .join(',')
      )
      .join('\n') + '\n';
  writeFileSync(join(PUBLIC_DIR, 'audit-log.csv'), csv);
  console.log('  ✓ toolkit/audit-log.csv');
}

async function buildOgImage() {
  const svgPath = join(__dirname, '..', 'public', 'og.svg');
  const pngPath = join(__dirname, '..', 'public', 'og.png');
  const svg = readFileSync(svgPath);
  await sharp(svg, { density: 200 })
    .resize(1200, 630, { fit: 'contain', background: { r: 251, g: 250, b: 246, alpha: 1 } })
    .png()
    .toFile(pngPath);
  console.log('  ✓ og.png (1200×630, rasterized from og.svg)');
}

async function main() {
  console.log('Building OpenCharts toolkit artifacts...');
  await buildLetter();
  await buildComplaintGuide();
  buildLog();
  await buildOgImage();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
