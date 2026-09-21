<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>OfficeEase</title>
<style>
  :root{
    --ink:#1b1b1b; --muted:#605e5c; --line:#e1dfdd;
    --blue:#0067b8; --blue-dark:#004f8e;
    --hero-bg:#f2f1e6; --card-img:#f3f2f1; --bg:#ffffff;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:"Segoe UI",Tahoma,Arial,sans-serif;
    padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}

  .navbar{
    background:#000; color:#fff; display:flex; align-items:center; gap:14px;
    padding:12px 16px; font-size:13px; top:env(safe-area-inset-top,0px);
  }
  .navbar .menu-dots{font-size:18px; letter-spacing:2px}
  .navbar .logo-box{
    width:26px;height:26px;border-radius:50%;border:1.5px solid #fff;
    display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;
  }
  .navbar .search{
    flex:1; background:#1b1b1b; border-radius:20px; padding:8px 14px; color:#c8c6c4; font-size:12.5px;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }

  .subnav{
    display:flex; align-items:center; gap:16px; padding:12px 16px; border-bottom:1px solid var(--line);
    overflow-x:auto; white-space:nowrap; font-size:12.5px; color:var(--ink);
  }
  .subnav b{font-weight:700; flex:none}
  .subnav span{color:var(--muted); flex:none}
  .subnav .brandmark{margin-inline-start:auto; font-weight:700; font-size:14px; flex:none; display:flex; align-items:center; gap:6px}
  .subnav .brandmark .sq{width:14px;height:14px;background:conic-gradient(var(--blue) 0 25%, #7fba00 0 50%, #ffb900 0 75%, #f25022 0 100%); border-radius:2px}

  .hero{background:var(--hero-bg); padding:34px 20px}
  .hero-icons{display:flex; justify-content:center; gap:6px; margin-bottom:26px; flex-wrap:wrap}
  .app-icon{
    width:44px;height:44px;border-radius:9px; display:flex;align-items:center;justify-content:center;
    color:#fff; font-size:18px; font-weight:800; box-shadow:0 3px 10px rgba(0,0,0,.12);
  }
  .hero h1{font-size:26px; font-weight:700; margin:0 0 10px; text-align:center}
  .hero p{font-size:14px; color:#3a3a3a; line-height:1.9; text-align:center; max-width:480px; margin:0 auto 18px}
  .hero-btn-wrap{text-align:center}
  .btn-blue{
    display:inline-block; background:var(--blue); color:#fff; border:none; padding:11px 24px;
    border-radius:2px; font-size:13.5px; font-weight:600; cursor:pointer; text-decoration:none;
  }
  .btn-blue:hover{background:var(--blue-dark)}

  .quicklinks{display:flex; justify-content:space-around; padding:22px 12px; border-bottom:1px solid var(--line)}
  .qlink{display:flex; flex-direction:column; align-items:center; gap:6px; font-size:11.5px; color:var(--ink); font-weight:600}
  .qlink .qicon{font-size:22px}

  .wrap{max-width:920px; margin:0 auto; padding:26px 14px 60px}
  .cat-title{font-size:17px; font-weight:700; margin:0 0 14px}

  .cards{display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:30px}
  @media (max-width:480px){ .cards{grid-template-columns:1fr 1fr} }
  .pcard{border:1px solid var(--line); border-radius:2px; overflow:hidden; display:flex; flex-direction:column}
  .pcard .thumb{
    background:var(--card-img); height:96px; display:flex; align-items:center; justify-content:center; font-size:34px;
  }
  .pcard .body{padding:12px 12px 14px; display:flex; flex-direction:column; flex:1}
  .pcard .body h3{font-size:13.5px; font-weight:700; margin:0 0 6px; line-height:1.4}
  .pcard .body p{font-size:11.5px; color:var(--muted); line-height:1.6; margin:0 0 12px; flex:1}
  .pcard .body a.btn-blue{font-size:12px; padding:8px 14px; text-align:center}
  .pcard .body .soon{
    font-size:11px; color:var(--muted); border:1px solid var(--line); border-radius:2px;
    padding:8px 14px; text-align:center;
  }
</style>
</head>
<body>
  <div class="navbar">
    <span class="menu-dots">⋮</span>
    <span class="logo-box">OE</span>
    <span class="search">🔍 ابحث في خدمات OfficeEase</span>
    <span>🏠</span>
  </div>

  <div class="subnav">
    <b>جميع خدمات OfficeEase</b>
    <span>معالجة المستندات</span><span>الأمان</span><span>الأرشفة</span><span>القانونية</span><span>المالية</span>
    <span class="brandmark"><span class="sq"></span>OfficeEase</span>
  </div>

  <div class="hero">
    <div class="hero-icons">
      <div class="app-icon" style="background:#0067b8">📄</div>
      <div class="app-icon" style="background:#107c41">📊</div>
      <div class="app-icon" style="background:#7719aa">🖋️</div>
      <div class="app-icon" style="background:#d24726">⚖️</div>
      <div class="app-icon" style="background:#ffb900;color:#3a2e00">🗄️</div>
    </div>
    <h1>منصة واحدة لتعزيز إنتاجيتك</h1>
    <p>20 خدمة ذكية لمعالجة المستندات، الأمان، الأرشفة، والأعمال الإدارية اليومية —
    كل ذلك في منصة واحدة مدعومة بالذكاء الاصطناعي.</p>
    <div class="hero-btn-wrap"><a href="#" class="btn-blue">استكشف الخدمات</a></div>
  </div>

  <div class="quicklinks">
    <div class="qlink"><span class="qicon">📄</span>معالجة مستندات</div>
    <div class="qlink"><span class="qicon">🛡️</span>الأمان</div>
    <div class="qlink"><span class="qicon">🗄️</span>الأرشفة</div>
    <div class="qlink"><span class="qicon">💼</span>الأعمال</div>
  </div>

  <div class="wrap">
    <h2 class="cat-title">معالجة المستندات والبيانات</h2>
    <div class="cards">
      <div class="pcard">
        <div class="thumb">📊</div>
        <div class="body"><h3>مُفرّغ الجداول العربية إلى Excel</h3>
        <p>استخراج جداول PDF عربية إلى Excel منظم بنفس الترتيب.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
      <div class="pcard">
        <div class="thumb">📎</div>
        <div class="body"><h3>تقسيم وتسمية المستندات المدمجة</h3>
        <p>فصل فواتير أو عقود مدمجة في ملف واحد تلقائياً.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
      <div class="pcard">
        <div class="thumb">🏦</div>
        <div class="body"><h3>تجميع ودمج كشوف الحسابات</h3>
        <p>دمج عدة كشوف بنكية في جدول واحد مرتب زمنياً.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
      <div class="pcard">
        <div class="thumb">✍️</div>
        <div class="body"><h3>تحويل الخط اليدوي إلى نص</h3>
        <p>تفريغ الكتابة اليدوية من الصور إلى نص رقمي.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
    </div>

    <h2 class="cat-title">الأمان والقانون</h2>
    <div class="cards">
      <div class="pcard">
        <div class="thumb">🔒</div>
        <div class="body"><h3>الطمس الأمني للبيانات</h3>
        <p>حذف نهائي للبيانات الحساسة من المستند.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
      <div class="pcard">
        <div class="thumb">⚖️</div>
        <div class="body"><h3>مقارنة العقود (Diffing)</h3>
        <p>إبراز الفروقات بين نسختين من عقد بالألوان.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
      <div class="pcard">
        <div class="thumb">📉</div>
        <div class="body"><h3>تحليل مخاطر بنود العقود</h3>
        <p>كشف البنود غير المتوازنة بالذكاء الاصطناعي.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
      <div class="pcard">
        <div class="thumb">🖋️</div>
        <div class="body"><h3>إزالة الأختام والتوقيعات</h3>
        <p>إزالة الأختام أو التوقيعات المطبوعة لاستعادة نقاء المستند الأصلي.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
    </div>

    <h2 class="cat-title">الأرشفة والأعمال الإدارية</h2>
    <div class="cards">
      <div class="pcard">
        <div class="thumb">🗄️</div>
        <div class="body"><h3>الأرشفة الذكية والبحث النصي</h3>
        <p>بحث بالكلمة داخل كل المستندات المؤرشفة.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
      <div class="pcard">
        <div class="thumb">✅</div>
        <div class="body"><h3>نظام الاعتمادات الموثّق</h3>
        <p>تمرير القرار على عدة معتمدين بالترتيب.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
      <div class="pcard">
        <div class="thumb">⏰</div>
        <div class="body"><h3>متتبّع انتهاء الصلاحية</h3>
        <p>تنبيه قبل انتهاء العقود والتراخيص.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
      <div class="pcard">
        <div class="thumb">🧾</div>
        <div class="body"><h3>عروض الأسعار ولوحة الصفقات</h3>
        <p>تحويل عرض السعر إلى فاتورة بضغطة واحدة.</p>
        <a href="#" class="btn-blue">تشغيل الخدمة</a></div>
      </div>
    </div>
  </div>
</body>
</html>
