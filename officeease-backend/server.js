// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { OUTPUT_DIR } = require('./utils/fileHelpers');

const textDataTools = require('./routes/textDataTools');
const visualTools = require('./routes/visualTools');
const securityBulkTools = require('./routes/securityBulkTools');
const phase2Tools = require('./routes/phase2Tools');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use('/outputs', express.static(path.resolve(OUTPUT_DIR)));
app.use(express.static(path.join(__dirname, 'public'))); // صفحة اختبار الواجهة

// تركيب كل مجموعات الخدمات تحت /api
app.use('/api', textDataTools); // خدمات 1-4
app.use('/api', visualTools); // خدمات 5-8
app.use('/api', securityBulkTools); // خدمات 9-12
app.use('/api', phase2Tools); // خدمات 13-20

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'OfficeEase Backend', time: new Date().toISOString() });
});

// قائمة كل الخدمات المتاحة (مرجع سريع للفريق الأمامي)
app.get('/api/services', (req, res) => {
  res.json({
    phase1: [
      { id: 1, name: 'مُفرّغ الجداول العربية إلى Excel', endpoint: 'POST /api/service1/arabic-tables-to-excel' },
      { id: 2, name: 'التقسيم والتسمية الذكية للمستندات المدمجة', endpoint: 'POST /api/service2/split-and-label' },
      { id: 3, name: 'تجميع ودمج كشوف الحسابات الموحدة', endpoint: 'POST /api/service3/merge-statements' },
      { id: 4, name: 'تحويل النصوص اليدوية إلى مستندات رقمية', endpoint: 'POST /api/service4/handwriting-to-text' },
      { id: 5, name: 'تنظيف وتبييض تصوير المستندات', endpoint: 'POST /api/service5/clean-scan' },
      { id: 6, name: 'تنظيف وإزالة الأختام والتوقيعات', endpoint: 'POST /api/service6/remove-stamp (يحتاج نموذج inpainting)' },
      { id: 7, name: 'الترجمة الذكية مع المحافظة على التنسيق', endpoint: 'POST /api/service7/translate' },
      { id: 8, name: 'الضغط الذكي مع الحفاظ على حدة النص', endpoint: 'POST /api/service8/compress' },
      { id: 9, name: 'الطمس والمسح الأمني الفعلي للبيانات', endpoint: 'POST /api/service9/redact-metadata و /service9/redact-area' },
      { id: 10, name: 'الختم والتوقيع الآلي الجماعي', endpoint: 'POST /api/service10/bulk-stamp' },
      { id: 11, name: 'تفريغ وعزل الأختام بصيغة شفافة', endpoint: 'POST /api/service11/extract-stamp (يحتاج معالجة صور متقدمة)' },
      { id: 12, name: 'المقارنة القانونية البصرية والنصية', endpoint: 'POST /api/service12/compare-pdfs' },
    ],
    phase2: [
      { id: 13, name: 'الأرشفة الذكية والبحث النصي الكامل', endpoint: 'POST /api/service13/archive ، GET /api/service13/search' },
      { id: 14, name: 'نظام الاعتمادات والتوقيع الموثّق', endpoint: 'POST /api/service14/requests' },
      { id: 15, name: 'متتبّع انتهاء صلاحية المستندات', endpoint: 'POST /api/service15/track ، GET /api/service15/expiring' },
      { id: 16, name: 'محضر الاجتماع التلقائي', endpoint: 'POST /api/service16/minutes' },
      { id: 17, name: 'تحليل مخاطر بنود العقود', endpoint: 'POST /api/service17/contract-risk' },
      { id: 18, name: 'مولّد عروض الأسعار ولوحة الصفقات', endpoint: 'POST /api/service18/quotes' },
      { id: 19, name: 'تسوية كشف الحساب البنكي', endpoint: 'POST /api/service19/reconcile' },
      { id: 20, name: 'محلّل السير الذاتية', endpoint: 'POST /api/service20/parse-cv ، /service20/rank' },
    ],
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'خطأ غير متوقع في السيرفر' });
});

app.listen(PORT, () => {
  console.log(`✅ OfficeEase Backend يعمل على http://localhost:${PORT}`);
  console.log(`   جرّب: http://localhost:${PORT}/api/services`);
  console.log(`   صفحة اختبار: http://localhost:${PORT}/`);
});
