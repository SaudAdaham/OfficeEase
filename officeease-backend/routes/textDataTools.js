// routes/textDataTools.js
// الخدمة 1: مُفرّغ الجداول العربية إلى Excel
// الخدمة 2: التقسيم والتسمية الذكية للمستندات المدمجة
// الخدمة 3: تجميع ودمج كشوف الحسابات الموحدة
// الخدمة 4: تحويل النصوص اليدوية إلى مستندات رقمية

const express = require('express');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const { upload, outputPath, publicOutputUrl } = require('../utils/fileHelpers');
const { askClaude, askClaudeJSON } = require('../utils/aiClient');

const router = express.Router();

/* ------------------------------------------------------------------ */
/* 1) مُفرّغ الجداول العربية إلى Excel                                  */
/* POST /api/service1/arabic-tables-to-excel  (form field: file = PDF) */
/* ------------------------------------------------------------------ */
router.post('/service1/arabic-tables-to-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع ملف PDF أولاً (حقل file)' });

    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);
    const rawText = parsed.text;

    // نستخدم Claude لفهم بنية الجدول العربي (اتجاه RTL) وتحويله لصفوف/أعمدة منظمة
    const tableJson = await askClaudeJSON(
      'أنت خبير في استخراج الجداول المالية العربية من نصوص PDF مفرّغة. ' +
        'حافظ على ترتيب الأعمدة الصحيح للغة العربية (RTL) ولا تعكس الأرقام أو الحروف. ' +
        'أعد كائن JSON بالشكل: {"sheets":[{"name":"...", "rows":[["عمود1","عمود2",...], ...]}]}',
      `النص المستخرج من الملف:\n\n${rawText.slice(0, 12000)}`
    );

    const workbook = new ExcelJS.Workbook();
    (tableJson.sheets || []).forEach((sheet, idx) => {
      const ws = workbook.addWorksheet(sheet.name || `Sheet${idx + 1}`);
      ws.views = [{ rightToLeft: true }];
      (sheet.rows || []).forEach((row) => ws.addRow(row));
      ws.columns.forEach((col) => (col.width = 20));
    });
    if (workbook.worksheets.length === 0) workbook.addWorksheet('Sheet1');

    const outName = `arabic-table-${uuidv4()}.xlsx`;
    await workbook.xlsx.writeFile(outputPath(outName));

    res.json({ success: true, file: publicOutputUrl(req, outName) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

/* ------------------------------------------------------------------------ */
/* 2) التقسيم والتسمية الذكية للمستندات المدمجة (فواتير/عقود مدمجة بملف واحد) */
/* POST /api/service2/split-and-label  (form field: file = PDF)             */
/* ------------------------------------------------------------------------ */
router.post('/service2/split-and-label', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع ملف PDF أولاً (حقل file)' });

    const buffer = fs.readFileSync(req.file.path);
    const srcDoc = await PDFDocument.load(buffer);
    const totalPages = srcDoc.getPageCount();

    // نستخرج نص كل صفحة لتحديد أين تبدأ/تنتهي كل فاتورة أو عقد، وما اسمها (رقم الفاتورة)
    const parsed = await pdfParse(buffer);
    // نطلب من Claude تحديد حدود المستندات بالاعتماد على النص الكامل مع أرقام الصفحات التقريبية
    const boundaries = await askClaudeJSON(
      'أنت مساعد لتحليل ملف PDF يحتوي على عدة فواتير أو عقود مدمجة. ' +
        `الملف يحتوي ${totalPages} صفحة إجمالاً. حدد لكل مستند فرعي رقم صفحة البداية والنهاية (فهرسة تبدأ من 1) واسم مناسب له (مثل رقم الفاتورة إن وجد). ` +
        'أعد JSON بالشكل: {"documents":[{"startPage":1,"endPage":2,"name":"INV-1001"}, ...]}',
      `نص الملف الكامل:\n\n${parsed.text.slice(0, 15000)}`
    );

    const outDir = outputPath(`split-${uuidv4()}`);
    fs.mkdirSync(outDir, { recursive: true });
    const results = [];

    for (const docInfo of boundaries.documents || []) {
      const newDoc = await PDFDocument.create();
      const start = Math.max(1, docInfo.startPage) - 1;
      const end = Math.min(totalPages, docInfo.endPage) - 1;
      const pageIndices = [];
      for (let i = start; i <= end; i++) pageIndices.push(i);
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((p) => newDoc.addPage(p));

      const safeName = (docInfo.name || `document-${results.length + 1}`).replace(/[\\/:*?"<>|]/g, '-');
      const fileName = `${safeName}.pdf`;
      const bytes = await newDoc.save();
      fs.writeFileSync(path.join(outDir, fileName), bytes);
      results.push(fileName);
    }

    res.json({
      success: true,
      count: results.length,
      files: results,
      folder: outDir,
      note: 'الملفات محفوظة على السيرفر داخل المجلد المذكور؛ يمكن إضافة تحميل مضغوط عبر archiver إن رغبتم.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

/* -------------------------------------------------------------- */
/* 3) تجميع ودمج كشوف الحسابات الموحدة (عدة PDF -> Excel واحد)      */
/* POST /api/service3/merge-statements  (form field: files[] = PDF) */
/* -------------------------------------------------------------- */
router.post('/service3/merge-statements', upload.array('files', 24), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'ارفع ملفات PDF (حقل files)' });
    }

    const allTransactions = [];
    for (const file of req.files) {
      const buffer = fs.readFileSync(file.path);
      const parsed = await pdfParse(buffer);
      const monthJson = await askClaudeJSON(
        'أنت محلل مالي. استخرج كل العمليات المالية من كشف الحساب البنكي التالي. ' +
          'أعد JSON بالشكل: {"transactions":[{"date":"YYYY-MM-DD","description":"...","debit":0,"credit":0,"balance":0}]}',
        parsed.text.slice(0, 12000)
      );
      (monthJson.transactions || []).forEach((t) => allTransactions.push(t));
    }

    // ترتيب زمني من الأقدم للأحدث
    allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('كشف موحد');
    ws.views = [{ rightToLeft: true }];
    ws.addRow(['التاريخ', 'البيان', 'مدين', 'دائن', 'الرصيد']);
    allTransactions.forEach((t) => ws.addRow([t.date, t.description, t.debit, t.credit, t.balance]));
    ws.columns.forEach((c) => (c.width = 22));

    const outName = `merged-statement-${uuidv4()}.xlsx`;
    await workbook.xlsx.writeFile(outputPath(outName));

    res.json({ success: true, transactions: allTransactions.length, file: publicOutputUrl(req, outName) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
  }
});

/* ------------------------------------------------------------------- */
/* 4) تحويل النصوص اليدوية (صورة) إلى نص رقمي منظم                       */
/* POST /api/service4/handwriting-to-text  (form field: image = صورة)    */
/* ------------------------------------------------------------------- */
router.post('/service4/handwriting-to-text', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع صورة (حقل image)' });

    const buffer = fs.readFileSync(req.file.path);
    const base64 = buffer.toString('base64');
    const ext = path.extname(req.file.originalname).toLowerCase();
    const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';

    const text = await askClaude(
      'أنت خبير في قراءة الخطوط اليدوية العربية والإنجليزية وتحويلها إلى نص رقمي منظم ودقيق. ' +
        'حافظ على فقرات وترقيم الأصل قدر الإمكان.',
      'حوّل محتوى هذه الصورة (خط يد) إلى نص رقمي كامل ومنظم.',
      { data: base64, mediaType }
    );

    res.json({ success: true, text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

module.exports = router;
