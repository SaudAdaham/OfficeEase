// utils/aiClient.js
// عميل موحّد لاستدعاء Claude (Anthropic API).
// كل الخدمات التي تحتاج "فهم" (ترجمة، تفريغ خط يد، تحليل عقود، فرز سير ذاتية...)
// تمر من هنا. لما تحطون ANTHROPIC_API_KEY في .env بيشتغل تلقائياً.

const fetch = require('node-fetch');

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

/**
 * يرسل رسالة نصية (وصورة اختياري base64) إلى Claude ويرجع النص الناتج.
 * @param {string} systemPrompt - تعليمات النظام (دور المساعد، صيغة الإخراج المطلوبة)
 * @param {string} userText - نص الطلب/المحتوى المطلوب معالجته
 * @param {Object} [imageBase64] - { data, mediaType } صورة اختيارية (لتفريغ الخط اليدوي مثلاً)
 * @returns {Promise<string>}
 */
async function askClaude(systemPrompt, userText, imageBase64 = null) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY غير موجود في .env — هذه الخدمة تحتاج مفتاح Claude API ليعمل. ' +
      'أضف المفتاح في ملف .env ثم أعد تشغيل السيرفر.'
    );
  }

  const content = [];
  if (imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: imageBase64.mediaType, data: imageBase64.data },
    });
  }
  content.push({ type: 'text', text: userText });

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`فشل استدعاء Claude API: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/** نفس الشيء لكن يطلب من Claude إخراج JSON فقط ويحاول تحليله */
async function askClaudeJSON(systemPrompt, userText, imageBase64 = null) {
  const fullSystem =
    systemPrompt +
    '\n\nمهم جداً: أجب فقط بكائن JSON صالح دون أي نص إضافي قبله أو بعده، ودون علامات ```.';
  const raw = await askClaude(fullSystem, userText, imageBase64);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error('تعذّر تحليل رد الذكاء الاصطناعي كـ JSON: ' + raw.slice(0, 300));
  }
}

module.exports = { askClaude, askClaudeJSON };
