// routes/phase2Tools.js
// 13: الأرشفة الذكية والبحث النصي الكامل
// 14: نظام الاعتمادات والتوقيع الإلكتروني الموثّق (Approval Workflow)
// 15: متتبّع انتهاء صلاحية المستندات
// 16: محضر الاجتماع التلقائي من تسجيل صوتي
// 17: تحليل مخاطر بنود العقود بالذكاء الاصطناعي
// 18: مولّد عروض الأسعار وتحويلها لفواتير + لوحة متابعة صفقات
// 19: تسوية كشف الحساب البنكي مع دفتر الأستاذ
// 20: محلّل السير الذاتية وفرز المتقدمين

const express = require('express');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const { upload, outputPath, publicOutputUrl } = require('../utils/fileHelpers');
const { askClaude, askClaudeJSON } = require('../utils/aiClient');

const router = express.Router();

/* ------------------------------------------------------------------ */
/* تخزين بسيط بملفات JSON على القرص (Prototype) — استبدله بقاعدة بيانات   */
/* حقيقية (PostgreSQL/MongoDB) عند ربط السيرفر الفعلي.                    */
/* ------------------------------------------------------------------ */
const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

function loadDB(name) {
  const file = path.join(DB_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function saveDB(name, data) {
  fs.writeFileSync(path.join(DB_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
}

/* -------------------------------------------------------- */
/* 13) الأرشفة الذكية والبحث النصي الكامل                       */
/* POST /api/service13/archive        (form: file = PDF)      */
/* GET  /api/service13/search?q=...                            */
/* -------------------------------------------------------- */
router.post('/service13/archive', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع ملف PDF (حقل file)' });

    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);

    const archive = loadDB('archive');
    const record = {
      id: uuidv4(),
      originalName: req.file.originalname,
      text: parsed.text,
      uploadedAt: new Date().toISOString(),
      storedPath: req.file.path, // في الإنتاج: خزّن على S3/تخزين سحابي دائم
    };
    archive.push(record);
    saveDB('archive', archive);

    res.json({ success: true, id: record.id, pages: parsed.numpages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/service13/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'أرسل ?q=كلمة البحث' });

  const archive = loadDB('archive');
  const results = archive
    .filter((doc) => doc.text.includes(q))
    .map((doc) => {
      const idx = doc.text.indexOf(q);
      const snippet = doc.text.slice(Math.max(0, idx - 60), idx + 60);
      return { id: doc.id, name: doc.originalName, snippet, uploadedAt: doc.uploadedAt };
    });

  res.json({ success: true, count: results.length, results });
});

/* ----------------------------------------------------------------------- */
/* 14) نظام الاعتمادات والتوقيع الإلكتروني (Approval Workflow) — Prototype   */
/* POST /api/service14/requests            body: { title, approvers: [] }   */
/* POST /api/service14/requests/:id/approve  body: { approverName }         */
/* GET  /api/service14/requests/:id                                          */
/* ----------------------------------------------------------------------- */
router.post('/service14/requests', express.json(), (req, res) => {
  const { title, approvers } = req.body;
  if (!title || !Array.isArray(approvers) || approvers.length === 0) {
    return res.status(400).json({ error: 'أرسل title و approvers (مصفوفة أسماء بالترتيب)' });
  }

  const requests = loadDB('approvals');
  const record = {
    id: uuidv4(),
    title,
    approvers: approvers.map((name) => ({ name, status: 'pending', signedAt: null })),
    currentStep: 0,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
  };
  requests.push(record);
  saveDB('approvals', requests);

  res.json({ success: true, request: record });
});

router.post('/service14/requests/:id/approve', express.json(), (req, res) => {
  const { approverName } = req.body;
  const requests = loadDB('approvals');
  const record = requests.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (record.status !== 'in_progress') return res.status(400).json({ error: 'هذا الطلب مغلق بالفعل' });

  const currentApprover = record.approvers[record.currentStep];
  if (!currentApprover || currentApprover.name !== approverName) {
    return res.status(403).json({ error: `الدور الحالي للاعتماد هو: ${currentApprover?.name || 'غير محدد'}` });
  }

  currentApprover.status = 'approved';
  currentApprover.signedAt = new Date().toISOString();
  record.currentStep += 1;
  if (record.currentStep >= record.approvers.length) record.status = 'completed';

  saveDB('approvals', requests);
  res.json({ success: true, request: record });
});

router.get('/service14/requests/:id', (req, res) => {
  const requests = loadDB('approvals');
  const record = requests.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'غير موجود' });
  res.json({ success: true, request: record });
});

/* ------------------------------------------------------------------- */
/* 15) متتبّع انتهاء صلاحية المستندات                                     */
/* POST /api/service15/track  (form: file=PDF, body: alertDaysBefore)     */
/* GET  /api/service15/expiring?withinDays=30                             */
/* ------------------------------------------------------------------- */
router.post('/service15/track', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع ملف PDF (حقل file)' });
    const alertDaysBefore = parseInt(req.body.alertDaysBefore || '30', 10);

    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);

    const info = await askClaudeJSON(
      'استخرج من نص العقد/الترخيص التالي: اسم المستند، تاريخ انتهاء الصلاحية إن وجد (YYYY-MM-DD)، ونوع المستند.',
      'أعد JSON بالشكل: {"documentName":"...", "expiryDate":"YYYY-MM-DD أو null", "type":"عقد/ترخيص/تفويض"}\n\n' +
        parsed.text.slice(0, 8000)
    );

    const tracked = loadDB('expirations');
    const record = { id: uuidv4(), ...info, alertDaysBefore, addedAt: new Date().toISOString() };
    tracked.push(record);
    saveDB('expirations', tracked);

    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

router.get('/service15/expiring', (req, res) => {
  const withinDays = parseInt(req.query.withinDays || '30', 10);
  const now = Date.now();
  const tracked = loadDB('expirations');

  const soon = tracked.filter((d) => {
    if (!d.expiryDate) return false;
    const diffDays = (new Date(d.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
    return diffDays <= withinDays;
  });

  res.json({ success: true, count: soon.length, documents: soon });
});

/* --------------------------------------------------------------- */
/* 16) محضر الاجتماع التلقائي من تسجيل صوتي                           */
/* ملاحظة: تحويل الصوت إلى نص (Speech-to-Text) يحتاج خدمة نسخ صوتي     */
/* (مثل Whisper) على السيرفر. هنا نبني الخطوة الثانية: تحويل           */
/* النص المفرّغ (transcript) إلى محضر منظم عبر الذكاء الاصطناعي.        */
/* POST /api/service16/minutes  body: { transcript }                  */
/* --------------------------------------------------------------- */
router.post('/service16/minutes', express.json({ limit: '5mb' }), async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'أرسل transcript (نص تفريغ الاجتماع)' });

    const minutes = await askClaudeJSON(
      'أنت سكرتير اجتماعات محترف. حوّل نص تفريغ الاجتماع التالي إلى محضر منظم.',
      'أعد JSON بالشكل: {"attendees":["..."], "discussionPoints":["..."], ' +
        '"decisions":["..."], "tasks":[{"task":"...","owner":"...","dueDate":"..."}]}\n\n' +
        transcript
    );

    res.json({ success: true, minutes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// TODO عند ربط السيرفر: أضف endpoint /service16/transcribe يستقبل ملف صوتي (mp3/wav)
// ويستخدم خدمة تحويل كلام-لنص (Whisper API أو أي مزود آخر) لإنتاج transcript
// تلقائياً، ثم يمرره لنفس المنطق أعلاه.

/* --------------------------------------------------------- */
/* 17) تحليل مخاطر بنود العقود بالذكاء الاصطناعي                */
/* POST /api/service17/contract-risk  (form: file = PDF)        */
/* --------------------------------------------------------- */
router.post('/service17/contract-risk', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع ملف PDF (حقل file)' });

    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);

    const analysis = await askClaudeJSON(
      'أنت محامٍ خبير في تحليل مخاطر العقود التجارية. راجع العقد التالي وحدد البنود ' +
        'غير المتوازنة، الناقصة، أو الخطرة على الطرف الذي يوقّع العقد.',
      'أعد JSON بالشكل: {"overallRiskLevel":"منخفض/متوسط/عالٍ", ' +
        '"flaggedClauses":[{"clauseText":"...", "riskLevel":"منخفض/متوسط/عالٍ", "reason":"..."}], ' +
        '"missingClauses":["..."]}\n\nنص العقد:\n\n' +
        parsed.text.slice(0, 15000)
    );

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

/* -------------------------------------------------------------------- */
/* 18) مولّد عروض الأسعار + تحويل لفاتورة + لوحة متابعة الصفقات (Pipeline) */
/* POST /api/service18/quotes           body: { client, items:[{desc,qty,price}] } */
/* POST /api/service18/quotes/:id/to-invoice                                        */
/* GET  /api/service18/pipeline                                                     */
/* -------------------------------------------------------------------- */
router.post('/service18/quotes', express.json(), (req, res) => {
  const { client, items } = req.body;
  if (!client || !Array.isArray(items)) return res.status(400).json({ error: 'أرسل client و items[]' });

  const total = items.reduce((sum, it) => sum + (it.qty || 1) * (it.price || 0), 0);
  const quotes = loadDB('quotes');
  const record = {
    id: uuidv4(),
    client,
    items,
    total,
    stage: 'قيد التفاوض',
    isInvoice: false,
    createdAt: new Date().toISOString(),
  };
  quotes.push(record);
  saveDB('quotes', quotes);

  res.json({ success: true, quote: record });
});

router.post('/service18/quotes/:id/to-invoice', (req, res) => {
  const quotes = loadDB('quotes');
  const record = quotes.find((q) => q.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'عرض السعر غير موجود' });

  record.isInvoice = true;
  record.stage = 'مُغلقة';
  record.invoiceNumber = `INV-${Date.now()}`;
  record.invoicedAt = new Date().toISOString();

  saveDB('quotes', quotes);
  res.json({ success: true, invoice: record });
});

router.get('/service18/pipeline', (req, res) => {
  const quotes = loadDB('quotes');
  const byStage = {};
  quotes.forEach((q) => {
    byStage[q.stage] = byStage[q.stage] || [];
    byStage[q.stage].push(q);
  });
  res.json({ success: true, pipeline: byStage });
});

/* -------------------------------------------------------------- */
/* 19) تسوية كشف الحساب البنكي مع دفتر الأستاذ (Bank Reconciliation) */
/* POST /api/service19/reconcile                                    */
/*   form: bankStatement=PDF, ledger=PDF (أو JSON عبر body.ledgerJson) */
/* -------------------------------------------------------------- */
router.post(
  '/service19/reconcile',
  upload.fields([{ name: 'bankStatement', maxCount: 1 }, { name: 'ledger', maxCount: 1 }]),
  async (req, res) => {
    try {
      const bankFile = req.files?.bankStatement?.[0];
      const ledgerFile = req.files?.ledger?.[0];
      if (!bankFile || !ledgerFile) {
        return res.status(400).json({ error: 'ارفع bankStatement و ledger (كلاهما PDF)' });
      }

      const bankText = (await pdfParse(fs.readFileSync(bankFile.path))).text;
      const ledgerText = (await pdfParse(fs.readFileSync(ledgerFile.path))).text;

      const result = await askClaudeJSON(
        'أنت محاسب. قارن معاملات كشف الحساب البنكي بمعاملات دفتر الأستاذ للشركة، ' +
          'وحدد أي معاملة موجودة في أحدهما وغير موجودة في الآخر (مثل شيكات لم تُصرف أو رسوم بنكية غير مسجّلة).',
        'أعد JSON بالشكل: {"matched":[...], "onlyInBank":[...], "onlyInLedger":[...], "totalDifference": 0}\n\n' +
          `كشف البنك:\n${bankText.slice(0, 8000)}\n\nدفتر الأستاذ:\n${ledgerText.slice(0, 8000)}`
      );

      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      if (req.files?.bankStatement?.[0]) fs.unlink(req.files.bankStatement[0].path, () => {});
      if (req.files?.ledger?.[0]) fs.unlink(req.files.ledger[0].path, () => {});
    }
  }
);

/* -------------------------------------------------------------- */
/* 20) محلّل السير الذاتية وفرز المتقدمين (CV Parser)                 */
/* POST /api/service20/parse-cv     (form: file = PDF)                */
/* POST /api/service20/rank         body: { jobRequirements, cvIds[] } */
/* -------------------------------------------------------------- */
router.post('/service20/parse-cv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع ملف PDF (حقل file)' });

    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);

    const cvData = await askClaudeJSON(
      'استخرج بيانات المتقدم من السيرة الذاتية التالية.',
      'أعد JSON بالشكل: {"name":"...", "yearsOfExperience":0, "skills":["..."], "education":"...", "summary":"..."}\n\n' +
        parsed.text.slice(0, 8000)
    );

    const candidates = loadDB('candidates');
    const record = { id: uuidv4(), ...cvData, addedAt: new Date().toISOString() };
    candidates.push(record);
    saveDB('candidates', candidates);

    res.json({ success: true, candidate: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

router.post('/service20/rank', express.json(), async (req, res) => {
  try {
    const { jobRequirements } = req.body;
    if (!jobRequirements) return res.status(400).json({ error: 'أرسل jobRequirements (نص متطلبات الوظيفة)' });

    const candidates = loadDB('candidates');
    const ranking = await askClaudeJSON(
      'رتّب المرشحين التالين تنازلياً حسب مدى تطابقهم مع متطلبات الوظيفة، وأعطِ نسبة تطابق تقريبية لكل واحد.',
      `متطلبات الوظيفة: ${jobRequirements}\n\nالمرشحون (JSON):\n${JSON.stringify(candidates)}\n\n` +
        'أعد JSON بالشكل: {"ranked":[{"id":"...", "name":"...", "matchScore":0}]}'
    );

    res.json({ success: true, ranking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
