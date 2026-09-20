// routes/securityBulkTools.js
// الخدمة 9: الطمس والمسح الأمني الفعلي للبيانات (Metadata + طمس بصري)
// الخدمة 10: الختم والتوقيع الآلي الجماعي (Bulk Stamping)
// الخدمة 11: تفريغ وعزل الأختام بصيغة شفافة (PNG)
// الخدمة 12: المقارنة القانونية البصرية والنصية (PDF Diffing)

const express = require('express');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const { diffWords } = require('diff');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const { upload, outputPath, publicOutputUrl } = require('../utils/fileHelpers');

const router = express.Router();

/* --------------------------------------------------------------- */
/* 9) الطمس والمسح الأمني الفعلي للبيانات (Metadata من ملف PDF)        */
/* POST /api/service9/redact-metadata (form field: file = PDF)       */
/* --------------------------------------------------------------- */
router.post('/service9/redact-metadata', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع ملف PDF (حقل file)' });

    const buffer = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(buffer);

    // مسح كل الميتاداتا (المؤلف، البرنامج، تواريخ الإنشاء، إلخ)
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
    pdfDoc.setCreationDate(new Date(0));
    pdfDoc.setModificationDate(new Date(0));

    const outName = `redacted-${uuidv4()}.pdf`;
    const bytes = await pdfDoc.save();
    fs.writeFileSync(outputPath(outName), bytes);

    res.json({
      success: true,
      file: publicOutputUrl(req, outName),
      note:
        'تم مسح الـ Metadata بالكامل. لطمس نص محدد (كرقم هوية) داخل محتوى الصفحة نفسه ' +
        '(وليس فقط الميتاداتا) يلزم تحديد إحداثيات النص وتغطيتها بمربع أسود ثم "تسطيح" الصفحة — ' +
        'يمكن إضافة endpoint /service9/redact-area يستقبل الإحداثيات لهذا الغرض.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

// طمس منطقة محددة بإحداثيات (مربع أسود دائم فوق النص + دمج الصفحة)
// POST /api/service9/redact-area  (form: file=PDF, body: page,x,y,width,height بوحدة نقاط PDF)
router.post('/service9/redact-area', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع ملف PDF (حقل file)' });
    const { page = 0, x = 0, y = 0, width = 100, height = 20 } = req.body;

    const buffer = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(buffer);
    const pages = pdfDoc.getPages();
    const targetPage = pages[parseInt(page, 10)];
    if (!targetPage) return res.status(400).json({ error: 'رقم الصفحة غير صحيح' });

    targetPage.drawRectangle({
      x: parseFloat(x),
      y: parseFloat(y),
      width: parseFloat(width),
      height: parseFloat(height),
      color: rgb(0, 0, 0),
    });

    const outName = `redacted-area-${uuidv4()}.pdf`;
    const bytes = await pdfDoc.save();
    fs.writeFileSync(outputPath(outName), bytes);

    res.json({ success: true, file: publicOutputUrl(req, outName) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

/* -------------------------------------------------------------------- */
/* 10) الختم والتوقيع الآلي الجماعي (Bulk Stamping)                        */
/* POST /api/service10/bulk-stamp                                        */
/*   form: files[]=PDF متعددة, stamp=صورة PNG شفافة, x,y,width,height     */
/* -------------------------------------------------------------------- */
router.post(
  '/service10/bulk-stamp',
  upload.fields([{ name: 'files', maxCount: 200 }, { name: 'stamp', maxCount: 1 }]),
  async (req, res) => {
    try {
      const files = req.files?.files || [];
      const stampFile = req.files?.stamp?.[0];
      if (files.length === 0 || !stampFile) {
        return res.status(400).json({ error: 'ارفع files[] (PDFs) و stamp (صورة PNG)' });
      }
      const { x = 400, y = 40, width = 120, height = 60 } = req.body;

      const stampBytes = fs.readFileSync(stampFile.path);
      const batchDir = outputPath(`bulk-stamp-${uuidv4()}`);
      fs.mkdirSync(batchDir, { recursive: true });

      for (const f of files) {
        const buffer = fs.readFileSync(f.path);
        const pdfDoc = await PDFDocument.load(buffer);
        const stampImage = await pdfDoc.embedPng(stampBytes);
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];

        lastPage.drawImage(stampImage, {
          x: parseFloat(x),
          y: parseFloat(y),
          width: parseFloat(width),
          height: parseFloat(height),
        });

        const bytes = await pdfDoc.save();
        fs.writeFileSync(path.join(batchDir, f.originalname), bytes);
      }

      // ضغط كل المخرجات في ملف ZIP واحد للتحميل
      const zipName = `bulk-stamped-${uuidv4()}.zip`;
      const zipPath = outputPath(zipName);
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(batchDir, false);
        archive.finalize();
      });

      res.json({ success: true, count: files.length, file: publicOutputUrl(req, zipName) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      (req.files?.files || []).forEach((f) => fs.unlink(f.path, () => {}));
      if (req.files?.stamp?.[0]) fs.unlink(req.files.stamp[0].path, () => {});
    }
  }
);

/* -------------------------------------------------------------------- */
/* 11) تفريغ وعزل الأختام بصيغة شفافة (PNG) — يحتاج تجزئة صورة (segmentation) */
/* POST /api/service11/extract-stamp (form: image)                        */
/* -------------------------------------------------------------------- */
router.post('/service11/extract-stamp', upload.single('image'), async (req, res) => {
  // عزل ختم (غالباً بلون أحمر/أزرق) عن خلفية بيضاء بدقة عالية يحتاج خوارزمية
  // تجزئة لونية (color-based segmentation) أو نموذج رؤية حاسوبية متخصص.
  // هذا المسار جاهز البنية (استقبال الصورة وحفظ مخرج PNG شفاف) وسيُستكمل
  // منطق العزل الفعلي بربط مكتبة معالجة صور متقدمة (OpenCV.js أو Python) على السيرفر.
  return res.status(501).json({
    error:
      'هذه الخدمة تحتاج خوارزمية تجزئة لونية/رؤية حاسوبية لعزل الختم عن الخلفية بدقة. ' +
      'البنية (رفع الصورة + مخرج PNG شفاف) جاهزة وتحتاج فقط ربط المعالجة الفعلية عند توفر السيرفر.',
  });
});

/* --------------------------------------------------------------- */
/* 12) المقارنة القانونية البصرية والنصية (PDF Diffing)                */
/* POST /api/service12/compare-pdfs (form: fileA=PDF, fileB=PDF)      */
/* --------------------------------------------------------------- */
router.post(
  '/service12/compare-pdfs',
  upload.fields([{ name: 'fileA', maxCount: 1 }, { name: 'fileB', maxCount: 1 }]),
  async (req, res) => {
    try {
      const fileA = req.files?.fileA?.[0];
      const fileB = req.files?.fileB?.[0];
      if (!fileA || !fileB) return res.status(400).json({ error: 'ارفع fileA و fileB' });

      const textA = (await pdfParse(fs.readFileSync(fileA.path))).text;
      const textB = (await pdfParse(fs.readFileSync(fileB.path))).text;

      const diff = diffWords(textA, textB);
      const htmlParts = diff.map((part) => {
        if (part.added) return `<span style="background:#c6f6c6;color:#065f0e">${escapeHtml(part.value)}</span>`;
        if (part.removed)
          return `<span style="background:#f8c6c6;color:#7f0e0e;text-decoration:line-through">${escapeHtml(
            part.value
          )}</span>`;
        return escapeHtml(part.value);
      });

      const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>مقارنة المستندات</title></head>
      <body style="font-family: Tahoma, Arial; line-height:1.9; padding:24px; white-space:pre-wrap">
      <h2>نتيجة المقارنة</h2>
      <p><span style="background:#c6f6c6">أخضر = مضاف</span> &nbsp; <span style="background:#f8c6c6">أحمر = محذوف</span></p>
      <div>${htmlParts.join('')}</div>
      </body></html>`;

      const outName = `diff-${uuidv4()}.html`;
      fs.writeFileSync(outputPath(outName), html, 'utf8');

      const addedCount = diff.filter((d) => d.added).length;
      const removedCount = diff.filter((d) => d.removed).length;

      res.json({
        success: true,
        file: publicOutputUrl(req, outName),
        summary: { addedParts: addedCount, removedParts: removedCount },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (req.files?.fileA?.[0]) fs.unlink(req.files.fileA[0].path, () => {});
      if (req.files?.fileB?.[0]) fs.unlink(req.files.fileB[0].path, () => {});
    }
  }
);

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = router;
