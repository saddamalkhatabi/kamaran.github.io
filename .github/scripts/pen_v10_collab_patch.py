from pathlib import Path
import subprocess,re

BASE='9cc0baec2d89b2e1418da3a4bfdce800bfadcdcc'
html=subprocess.check_output(['git','show',BASE+':pen/index.html'],text=True)
html=html.replace('<title>لوحة الطفل - امسك القلم وارسم v8</title>','<title>لوحة الطفل - امسك القلم وارسم v10</title>')

extra_css=r'''\n#syncPanel .sessionMode{background:#eef7ff;border:1px solid #bad8ef;border-radius:8px;padding:9px;margin:7px 0}#syncRepeatCount{font-weight:bold;color:#08716c;margin:6px 0}#syncTaskInfo{font-size:12px;line-height:1.7;color:#425f66}.syncActionRow{text-align:center;margin:8px 0}.syncActionRow button{font-weight:bold}.drawGallery{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;direction:rtl}.drawCard{width:270px;max-width:96%;border:1px solid #c8dada;border-radius:8px;background:#fff;padding:5px;box-sizing:border-box}.drawCardTitle{font-size:11px;min-height:28px;color:#31545a;text-align:center}.drawCard canvas{position:static!important;width:260px!important;max-width:100%;height:160px!important;border:1px solid #edf1f1;background:#fff;touch-action:auto!important}.rankTitle{font-size:18px;font-weight:bold;color:#8b6500;margin:7px}.rankRow{padding:8px;margin:5px 0;border-radius:7px;background:#f5faf9;border:1px solid #d6e7e5}.rankRow:first-of-type{background:#fff6cb;border-color:#e8ca53}.rankDetails{font-size:11px;color:#607d8b;margin-top:3px}.rankRow span{font-size:11px;color:#48656c}#syncRanking:empty{display:none}@media(max-width:700px){.drawCard{width:98%}.drawCard canvas{width:100%!important}.syncActionRow button{width:46%;margin:2px}}\n'''
html=html.replace('</style>',extra_css+'</style>',1)

start=html.index('<div id="syncPanel">')
end=html.index('\n<script>\n(function(){',start)
new_panel=r'''<div id="syncPanel"><button id="syncClose">إغلاق</button><div id="syncTitle">🔄 المزامنة والرسم الجماعي</div>
<div class="syncBox"><h3>نوع الجلسة</h3><div class="sessionMode"><label>طريقة العمل <select id="syncSessionMode"><option value="shared">شاشة واحدة مشتركة</option><option value="individual">لوحة مستقلة لكل مشارك</option></select></label><div id="syncTaskInfo">شاشة واحدة مشتركة: الجميع يشاهد نفس اللوحة.</div><div id="syncRepeatCount">عدد المشاركين/التكرارات الحالية: 1</div></div><div class="syncNote">في «اللوحات المستقلة» اختر قبل إنشاء الجلسة تبويب الأشكال أو الحروف أو الأرقام أو الرسومات والعنصر الذي تريد البدء منه. يوزّع التطبيق تلقائياً عنصراً مختلفاً لكل مشارك، ويزيد عدد المهام والتكرارات مع عدد الداخلين. إذا زاد العدد عن العناصر المتاحة يبدأ التكرار من البداية.</div></div>
<div class="syncBox"><h3>إنشاء جلسة أو الدخول إليها</h3><label>رمز المشاركة <input id="syncRoomInput" type="text" maxlength="16" placeholder="مثال: NOOR25"></label><button id="syncGenerateBtn">توليد رمز تلقائي</button><br><label>صلاحية التحكم <select id="syncAdminMode"><option value="creator">المنشئ فقط أدمن</option><option value="all">الجميع أدمن</option></select></label><br><button id="syncCreateBtn" class="syncGood">إنشاء جلسة</button><button id="syncJoinBtn" class="syncGood">دخول بالرمز</button><button id="syncLeaveBtn" class="syncDanger">مغادرة</button></div>
<div class="syncBox"><h3>المشاركة</h3><div>الرمز الحالي: <span id="syncCodeView" class="syncCode">—</span></div><button id="syncCopyCodeBtn">نسخ الرمز</button><button id="syncShareBtn" class="syncWarn">مشاركة الرابط</button><input id="syncLinkInput" type="text" readonly style="width:95%;max-width:650px;direction:ltr;text-transform:none" value=""><div class="syncNote">يمكن الدخول مباشرة من رابط المشاركة أو بإدخال الرمز يدوياً، بدون حساب.</div></div>
<div class="syncBox"><h3>الحالة والمشاركون</h3><div id="syncStatus" class="syncStatus">غير متصل</div><div id="syncUsers" class="syncUsers">لا يوجد مشاركون بعد.</div></div>
<div class="syncBox"><h3>اللوحات المستقلة</h3><div class="syncActionRow"><button id="syncReassignBtn" class="syncWarn">🔁 إعادة توزيع المهام</button><button id="syncGalleryBtn">🎨 تحديث/مشاهدة رسومات الجميع</button></div><div id="syncGallery" class="drawGallery"><div class="syncNote">لا توجد رسومات بعد.</div></div></div>
<div class="syncBox"><h3>🏆 التقييم الذكي للمشاركين</h3><div class="syncNote">يقارن التقييم الرسم بالنموذج المعروض لكل مستخدم عبر قرب الخط من النموذج، وتغطية أجزاء النموذج، واكتمال المسار. في الرسم الحر يكون التقييم تقريبياً. النتيجة تشجيعية تعليمية وليست حكماً فنياً نهائياً.</div><div class="syncActionRow"><button id="syncEvaluateBtn" class="syncGood">🏆 تقييم أفضل رسمة وإعلان الترتيب</button></div><div id="syncRanking"></div></div>
<div class="syncBox"><h3>ما الذي تتم مزامنته؟</h3><div class="syncNote">في «شاشة واحدة» تتزامن الرسمات للجميع، ومع «الجميع أدمن» تتزامن أيضاً تغييرات النشاط والعنصر والمسح والتراجع. في «لوحة مستقلة» يعمل كل طفل على مهمته الخاصة، بينما تصل نسخ رسماته لبقية المشاركين داخل معرض الرسومات ويمكن تقييم الجميع معاً.</div><div id="syncCompat" class="syncNote"></div></div></div>'''
html=html[:start]+new_panel+html[end:]
html=html.replace('<script src="sync-v8.js"></script>','<script src="sync-v10-extra.js"></script>')
if 'syncSessionMode' not in html or 'sync-v10-extra.js' not in html:
    raise SystemExit('v10 panel/script patch failed')
Path('pen/index.html').write_text(html,encoding='utf-8')

swp=Path('pen/sw.js')
sw=swp.read_text(encoding='utf-8')
sw=re.sub(r"var CACHE='noor-draw-v\d+';","var CACHE='noor-draw-v10';",sw)
sw=re.sub(r"var FILES=\[[^\n]+\];","var FILES=['./','./index.html','./manifest.json','./sync-v10-extra.js'];",sw)
swp.write_text(sw,encoding='utf-8')
print('patched v10')