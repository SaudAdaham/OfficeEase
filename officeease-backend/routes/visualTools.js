// routes/visualTools.js
// الخدمة 5: تنظيف وتبييض تصوير المستندات
// الخدمة 6: تنظيف وإزالة الأختام والتوقيعات
// الخدمة 7: الترجمة الذكية مع المحافظة على التنسيق
// الخدمة 8: الضغط الذكي مع الحفاظ على حدة النص

const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { upload, outputPath, publicOutputUrl } = require('../utils/fileHelpers');
const { askClaude } = require('../utils/aiClient');

const router = express.Router();

/* -------------------------------------------------------------- */
/* 5) تنظيف وتبييض تصوير المستندات (تصحيح إضاءة/تباين/ميلان بسيط)   */
/* POST /api/service5/clean-scan  (form field: image)               */
/* -------------------------------------------------------------- */
router.post('/service5/clean-scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع صورة (حقل image)' });

    const outName = `clean-scan-${uuidv4()}.png`;
    await sharp(req.file.path)
      .rotate() // تصحيح الاتجاه تلقائياً حسب EXIF
      .grayscale(false)
      .normalize() // تحسين التباين تلقائياً (يبيّض الخلفية ويبرز النص)
      .sharpen()
      .toFile(outputPath(outName));

    res.json({
      success: true,
      file: publicOutputUrl(req, outName),
      note: 'تصحيح الميلان الهندسي الكامل (Deskew) يحتاج مكتبة رؤية حاسوبية (مثل OpenCV) على السيرفر — جاهز للإضافة لاحقاً.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

/* --------------------------------------------------------------------- */
/* 6) تنظيف وإزالة الأختام/التوقيعات — يحتاج نموذج inpainting متخصص       */
/* POST /api/service6/remove-stamp  (form field: image)                    */
/* --------------------------------------------------------------------- */
router.post('/service6/remove-stamp', upload.single('image'), async (req, res) => {
  // ملاحظة صريحة: إزالة ختم/توقيع واستعادة النص الأصلي تحته تحتاج نموذج
  // inpainting متخصص (مثل LaMa أو Stable Diffusion inpainting) يعمل على السيرفر بمعالج GPU.
  // هذا المسار جاهز البنية فقط، ويحتاج ربط نموذج inpainting فعلي عند تجهيز السيرفر.
  return res.status(501).json({
    error:
      'هذه الخدمة تحتاج نموذج ذكاء اصطناعي متخصص لإزالة الأختام (inpainting) يعمل على سيرفر GPU. ' +
      'البنية جاهزة (رفع الصورة + حفظ المخرج) وتحتاج فقط ربط النموذج عند توفر السيرفر.',
  });
});

/* ----------------------------------------------------------------- */
/* 7) الترجمة الذكية مع المحافظة على التنسيق (نص عادي بسيط الآن)        */
/* POST /api/service7/translate  (json: { text, targetLang }) */
/* ----------------------------------------------------------------- */
router.post('/service7/translate', express.json(), async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json({ error: 'أرسل text و targetLang في body' });
    }

    const translated = await askClaude(
      'أنت مترجم محترف. ترجم النص المعطى بدقة مع الحفاظ على الفقرات والترقيم والعناوين كما هي في الأصل.',
      `ترجم النص التالي إلى (${targetLang}):\n\n${text}`
    );

    res.json({ success: true, translated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ملاحظة: للحفاظ الكامل على تصميم/جداول/ألوان ملف Word أو PDF أثناء الترجمة،
// يلزم لاحقاً استخدام docx (مكتبة) أو pdf-lib لإعادة كتابة النص داخل نفس الكائنات
// بدل استخراجه كنص عادي فقط — هذا يُضاف كخطوة تالية بعد ربط السيرفر.

/* -------------------------------------------------------- */
/* 8) الضغط الذكي للصور مع الحفاظ على حدة النص                */
/* POST /api/service8/compress  (form field: image, query: targetKB) */
/* -------------------------------------------------------- */
router.post('/service8/compress', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ارفع صورة (حقل image)' });
    const targetKB = parseInt(req.query.targetKB || '500', 10);

    let quality = 90;
    const outName = `compressed-${uuidv4()}.jpg`;
    const outFile = outputPath(outName);

    // نقلل الجودة تدريجياً حتى نصل للحجم المستهدف مع الحفاظ على أعلى وضوح ممكن
    let sizeKB = Infinity;
    while (quality >= 20 && sizeKB > targetKB) {
      await sharp(req.file.path).jpeg({ quality, mozjpeg: true }).toFile(outFile);
      sizeKB = fs.statSync(outFile).size / 1024;
      quality -= 10;
    }

    res.json({ success: true, file: publicOutputUrl(req, outName), finalSizeKB: Math.round(sizeKB) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

module.exports = router;
