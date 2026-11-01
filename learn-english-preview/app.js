
"use strict";
const $ = id => document.getElementById(id);
const escapeHtml = x => String(x ?? "").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const deepNames={basic:"أساسي",intermediate:"متوسط",advanced:"متقدم"};
let LIB=[], CORPUS={patterns:[],categories:[]};
const state={view:"learn",lesson:0,depth:0,scene:0,search:"",category:"",depthFilter:"",visible:28,answer:[],auto:false,playing:null,playSeq:0,modal:null,complete:new Set()};
try{state.complete=new Set(JSON.parse(localStorage.getItem("pattern-universe-complete")||"[]"))}catch(e){}
const conf={autoTimer:null,toastTimer:null,highlightFrame:null};
const sceneKey=()=>[LIB[state.lesson].id,state.depth,state.scene].join(":");
const activeLesson=()=>LIB[state.lesson];
const activeLevel=()=>activeLesson().levels[state.depth];
const activeScene=()=>activeLevel().scenes[state.scene];
function toast(message){let el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(conf.toastTimer);conf.toastTimer=setTimeout(()=>el.classList.remove("show"),3300)}
function stopAudio(){window.PATTERN_READ_ALONG?.end();state.playSeq++;clearTimeout(conf.autoTimer);if(conf.highlightFrame){cancelAnimationFrame(conf.highlightFrame);conf.highlightFrame=null}if(state.audioHighlightTarget){markWord(state.audioHighlightTarget,state.audioHighlightText,-1);state.audioHighlightTarget=null}if(state.playing){state.playing.pause();state.playing.currentTime=0;state.playing=null}if("speechSynthesis" in window)speechSynthesis.cancel()}
function statusAudio(kind){$("audioStatus").textContent="مصدر الصوت الحالي: "+kind}
function utter(text,slow,onDone,seq,target=null){if(!("speechSynthesis" in window)){toast("لا يتوفر صوت اصطناعي في هذا المتصفح.");return}const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=slow?.78:.94;u.pitch=1.02;let vs=speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith("en"));let choice=vs.find(v=>/natural|samantha|jenny|google us english|aria|emma/i.test(v.name));if(choice)u.voice=choice;u.onend=()=>{if(seq===state.playSeq){if(target)markWord(target,text,-1);if(onDone)onDone()}};u.onerror=()=>{};if(target){u.onboundary=e=>{const hits=[...text.matchAll(/\S+/g)];const idx=hits.findIndex((m,i)=>e.charIndex>=m.index&&(i===hits.length-1||e.charIndex<hits[i+1].index));if(idx>=0)markWord(target,text,idx)}}speechSynthesis.speak(u)}
// Match word highlighting to actual decoded MP3 time, as in app360 Read Along.
// Never distribute the duration by word length: that produces misleading highlights.
let acousticCuesPromise=null;
function loadAcousticCues(){
 if(!acousticCuesPromise)acousticCuesPromise=fetch("data/audio-word-cues.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).catch(()=>null);
 return acousticCuesPromise;
}
async function getAlignment(path,text){
 if(!path)return null;
 const store=await loadAcousticCues();
 const entry=store?.items?.[path];
 const tokens=text.trim().split(/\s+/);
 if(!entry||entry.text!==text||entry.language!=="en"||!Array.isArray(entry.cues)||entry.cues.length!==tokens.length||!entry.audio_sha256)return null;
 if(!entry.cues.every((c,i)=>Array.isArray(c)&&c.length===3&&c[0]===i&&Number.isFinite(c[1])&&Number.isFinite(c[2])&&c[1]>=0&&c[2]>c[1]&&c[2]<=entry.duration_ms+30&&(!i||entry.cues[i-1][2]<=c[1])))return null;
 return entry;
}
function findSpokenWord(cues,timeMs){
 let low=0,high=cues.length-1,hit=-1;
 while(low<=high){let mid=(low+high)>>1;if(cues[mid][1]<=timeMs){hit=mid;low=mid+1}else high=mid-1}
 return hit>=0&&timeMs<cues[hit][2]?cues[hit][0]:-1;
}
function resolvePreviewAudio(path){
 const parts=String(path||"").split("/");
 const recorded=parts.length===4 && parts[0]==="assets" && parts[1]==="audio" &&
   window.LE_ENGLISH_AUDIO && window.LE_ENGLISH_AUDIO[parts[2]] && window.LE_ENGLISH_AUDIO[parts[2]][parts[3]];
 return recorded?"data:audio/mpeg;base64,"+recorded:path;
}
function playAudio(path,text,slow=false,onDone=null,target=null){
 stopAudio();const seq=state.playSeq;let finished=false;
 if(target){state.audioHighlightTarget=target;state.audioHighlightText=text;markWord(target,text,-1);window.PATTERN_READ_ALONG?.begin(target,text)}
 const fallback=()=>{
  if(seq!==state.playSeq||finished)return;finished=true;
  statusAudio("نطق المتصفح الإنجليزي — الإشارة للكلمة تعتمد على حدود النطق التي يدعمها المتصفح");
  utter(text,slow,onDone,seq,target);
 };
 if(!path){fallback();return}
 const playbackUrl=typeof resolvePreviewAudio==="function"?resolvePreviewAudio(path):path;
 const audio=new Audio(playbackUrl);state.playing=audio;audio.preload="auto";audio.playbackRate=slow?.78:1;
 let measured=null,lastMarked=-2,frame=null;
 function tick(){
  if(seq!==state.playSeq||audio.paused||audio.ended)return;
  if(measured&&target){const index=findSpokenWord(measured.cues,audio.currentTime*1000);
   if(index!==lastMarked){markWord(target,text,index);lastMarked=index}}
  frame=requestAnimationFrame(tick);conf.highlightFrame=frame;
 }
 if(target)getAlignment(path,text).then(entry=>{
  if(seq!==state.playSeq||!entry)return;
  if(Number.isFinite(audio.duration)&&Math.abs(audio.duration*1000-entry.duration_ms)>650)return;
  measured=entry;
  statusAudio("Kokoro MP3 + توقيت الكلمات المقاس من التسجيل الأصلي");
 });
 audio.addEventListener("playing",()=>{
  if(seq!==state.playSeq)return;
  statusAudio(measured?"Kokoro MP3 + توقيت صوتي مقاس":"Kokoro MP3 — توقيت الكلمات الدقيق غير متوفر بعد؛ أوقفنا التلوين التخميني");
  if(target&&frame===null)tick();
 },{once:true});
 audio.addEventListener("ended",()=>{
  if(seq!==state.playSeq)return;
  if(conf.highlightFrame){cancelAnimationFrame(conf.highlightFrame);conf.highlightFrame=null}
  if(target)markWord(target,text,-1);
  if(onDone)onDone();
 },{once:true});
 audio.addEventListener("error",fallback,{once:true});
 audio.play().catch(fallback);
}
function audioFile(kind){const l=activeLesson();return "assets/audio/"+l.id+"/"+(kind==="intro"?"intro.mp3":"scene-"+(state.depth+1)+"-"+(state.scene+1)+".mp3")}
function markComplete(){state.complete.add(sceneKey());try{localStorage.setItem("pattern-universe-complete",JSON.stringify([...state.complete]))}catch(e){};renderStats()}
function renderStats(){$("sPatterns").textContent=CORPUS.patterns.length.toLocaleString("en-US");$("sProgress").textContent=state.complete.size+" / 36";$("headerStats").textContent="36 مشهدًا · "+state.complete.size+" مكتملًا"}
function go(view){stopAudio();if(view!=="paths")window.PATTERN_CURRICULUM?.stop();if(view!=="group-one")window.GROUP_ONE?.stop();if(view!=="group-two")window.GROUP_TWO?.stop();state.auto=false;state.view=view;["learn","group-one","group-two","paths","catalog","compare","guide"].forEach(v=>$("view-"+v).classList.toggle("hidden",v!==view));document.querySelectorAll("[data-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===view));if(view==="catalog")renderCatalog();if(view==="compare")renderCompare();if(view==="group-one")window.GROUP_ONE?.open();if(view==="group-two")window.GROUP_TWO?.open();window.scrollTo({top:0,behavior:"smooth"})}
function chooseLesson(i){stopAudio();state.auto=false;state.lesson=Math.max(0,Math.min(LIB.length-1,i));state.depth=0;state.scene=0;renderStudy();go("learn");$("study").scrollIntoView({behavior:"smooth",block:"start"})}
function thumbPosition(tile){return (tile%4)*100/3+"% "+Math.floor(tile/4)*50+"%"}
// Authored 4x3 WebP atlases, each with twelve original photorealistic lesson scenes.
// Lesson 0..2 and scene 0..11 map exactly to the text, level and scene position.
function photoStyle(lessonId, tile){
 const number=Math.max(0,Math.min(11,Math.floor(Number(tile)||0)));
 const pos=thumbPosition(number);
 const atlas="assets/real-scenes/"+lessonId+"-scenes.webp";
 return 'background-image:url("'+atlas+'"),url("assets/scenes.svg");background-size:400% 300%,400% 300%;background-position:'+pos+','+pos+';background-repeat:no-repeat;';
}
function storyPhotoIndex(lessonId, entry){
 const t=String(entry?.en||"").toLowerCase();
 // Prefer exact matching of an authored main lesson utterance to its corresponding picture.
 const lesson=LIB.find(l=>l.id===lessonId);
 if(lesson)for(let d=0;d<lesson.levels.length;d++)for(let i=0;i<lesson.levels[d].scenes.length;i++){
  if(lesson.levels[d].scenes[i].en.toLowerCase()===t)return d*4+i;
 }
 if(lessonId==="this"){
  if(/bags?/.test(t))return 11;if(/work|live|office/.test(t))return 10;
  if(/books/.test(t))return 5;if(/book/.test(t))return 1;
  if(/friends/.test(t))return 6;if(/friend/.test(t))return 2;
  if(/far|that|there/.test(t))return 4;
  if(/house|home|room/.test(t))return 0;
  return Math.max(0,Math.min(11,Number(entry?.tile)||0));
 }
 if(lessonId==="have"){
  if(/tickets?|train/.test(t))return 6;if(/books?/.test(t))return 7;
  if(/laptop|computer/.test(t))return 1;if(/ideas?|meeting|plan/.test(t))return 2;
  if(/cars?/.test(t))return 4;if(/time|talk|minute/.test(t))return 10;
  if(/new job|good job|my job|work|manager|desk|office/.test(t))return 0;
  return 0;
 }
 if(/phone|message/.test(t))return 1;
 if(/ticket|train/.test(t))return 2;if(/pens?/.test(t))return 3;
 if(/books?/.test(t))return 11;if(/cars?/.test(t))return 5;
 if(/everything|travel|trip|bag|packing/.test(t))return 6;
 if(/leave|late|now/.test(t))return 8;
 if(/ask|minute|talk/.test(t))return 10;
 if(/job|work|manager/.test(t))return 0;
 return 7;
}
function renderLessonCards(){$("lessonCards").innerHTML=LIB.map((l,i)=>'<article class="lessonCard '+(i===state.lesson?"active":"")+'"><div class="thumb" style="'+photoStyle(l.id,0)+'"><span class="n">#'+(i+1)+'</span></div><div class="copy"><b lang="en">'+escapeHtml(l.title)+'</b><p>'+escapeHtml(l.ar)+' · 12 مشهدًا</p><button class="btn '+(i===state.lesson?"primary":"alt")+'" data-lesson="'+i+'">'+(i===state.lesson?"الدرس الجاري":"ابدأ الرحلة")+'</button></div></article>').join("");
 document.querySelectorAll("[data-lesson]").forEach(b=>b.onclick=()=>chooseLesson(+b.dataset.lesson))}
function highlighted(line){let regex=state.lesson===0?/\b(this is|that is|these are|those are|is this|this isn't)\b/i:state.lesson===1?/\b(have to|have|has|does|don't have|do you have)\b/i:/\b(i've got|she's got|haven't got|has he got|we've got|got to|you've got)\b/i;const m=line.match(regex);if(!m)return escapeHtml(line);return escapeHtml(line.slice(0,m.index))+'<span class="focus">'+escapeHtml(m[0])+'</span>'+escapeHtml(line.slice(m.index+m[0].length))}
function renderStudy(){if($("introReadAlong"))$("introReadAlong").hidden=true;renderLessonCards();let l=activeLesson(),lev=activeLevel();$("lessonBadge").textContent="النمط "+(state.lesson+1)+" من 3 · "+deepNames[["basic","intermediate","advanced"][state.depth]];$("lessonTitle").textContent=l.title;$("lessonDescription").textContent=l.description;$("lessonInfo").textContent=l.description;$("formula").textContent=l.formula;
 $("depthTabs").innerHTML=l.levels.map((d,i)=>'<button data-depth="'+i+'" class="'+(i===state.depth?"active":"")+'">'+escapeHtml(d.label)+'<small>'+(i===0?"تعرف وبساطة":i===1?"النفي والسؤال":"الدمج والاستخدام")+'</small></button>').join("");
 document.querySelectorAll("[data-depth]").forEach(b=>b.onclick=()=>{stopAudio();state.auto=false;state.depth=+b.dataset.depth;state.scene=0;renderStudy()});
 $("relationships").innerHTML=l.related.map(id=>{let other=LIB.find(x=>x.id===id);return other?'<button class="btn tiny" data-rel="'+escapeHtml(id)+'">'+escapeHtml(other.title)+'</button>':""}).join("")+'<button class="btn tiny" id="viewLibrary">بحث في المكتبة ←</button>';
 document.querySelectorAll("[data-rel]").forEach(b=>b.onclick=()=>chooseLesson(LIB.findIndex(x=>x.id===b.dataset.rel)));$("viewLibrary").onclick=()=>{go("catalog");$("search").value=state.lesson===0?"this":state.lesson===1?"have":"got";renderCatalog()};
 renderScene();renderStory()}
function renderScene(){const s=activeScene(),l=activeLesson(),lev=activeLevel(),i=state.scene;const atlasTile=state.depth*4+i;
 $("sceneArt").style.cssText=photoStyle(l.id,atlasTile);$("sceneLocation").textContent=s.context;$("sceneBubble").textContent=s.en;$("sceneCount").textContent="المشهد "+(i+1)+" / "+lev.scenes.length;$("sentenceEn").innerHTML=highlighted(s.en);$("sentenceAr").textContent=s.ar;$("sentenceHint").textContent="مفتاح الفهم: "+s.hint;
 $("stepLabel").textContent=lev.label+" · المشهد "+(i+1)+" / 4";$("prevScene").disabled=state.depth===0&&i===0;
 $("nextScene").textContent=state.depth===2&&i===3?"العودة لأول مشهد ←":"التالي ←";
 $("sceneDots").innerHTML=lev.scenes.map((x,n)=>'<button data-dot="'+n+'" aria-label="المشهد '+(n+1)+'" class="'+(n===i?"active":"")+'"></button>').join("");document.querySelectorAll("[data-dot]").forEach(b=>b.onclick=()=>{stopAudio();state.scene=+b.dataset.dot;renderScene()});
 $("reviewLines").textContent=lev.scenes.slice(0,3).map(x=>x.en).join("  •  ");
 $("autoplay").textContent="⟳ تسلسل المشاهد: "+(state.auto?"مفعّل":"مغلق");
 $("quizFeedback").textContent="";$("builderFeedback").textContent="";renderQuiz();resetBuilder();renderStats()}
function move(dir){stopAudio();let n=state.scene+dir;if(n>=4){state.scene=0;state.depth=(state.depth+1)%3;renderStudy()}else if(n<0){if(state.depth===0)return;state.depth--;state.scene=3;renderStudy()}else{state.scene=n;renderScene()};$("study").scrollIntoView({block:"start",behavior:"smooth"})}
function playCurrent(chain=false){const s=activeScene();playAudio(audioFile("scene"),s.en,false,()=>{if(chain&&state.auto){markComplete();conf.autoTimer=setTimeout(()=>moveAuto(),700)}},$("sentenceEn"))}
function moveAuto(){if(!state.auto)return;if(state.scene===3&&state.depth===2){state.auto=false;toast("أتممت رحلة المشاهد الثلاثة. جرّب الاختبار الآن.");renderScene();return}move(1);playCurrent(true)}
function playIntro(){const panel=$("introReadAlong"),target=$("explanationEn");panel.hidden=false;target.textContent=activeLesson().explanationEn;playAudio(audioFile("intro"),activeLesson().explanationEn,false,null,target)}
function shuffle(xs){let a=[...xs];for(let i=a.length-1;i>0;i--){let j=(i*5+state.lesson+state.scene*7+state.depth)% (i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function renderQuiz(){const current=activeScene();let others=activeLevel().scenes.filter(x=>x!==current).map(x=>x.en);let options=shuffle([current.en,others[(state.scene+1)%others.length],others[(state.scene+2)%others.length]]);$("quiz").innerHTML=options.map((x,i)=>'<button data-answer="'+i+'">'+escapeHtml(x)+'</button>').join("");document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-answer]").forEach(x=>x.classList.remove("bad","good"));if(options[+b.dataset.answer]===current.en){b.classList.add("good");$("quizFeedback").textContent="أحسنت! اخترت التعبير المناسب ✓";markComplete()}else{b.classList.add("bad");$("quizFeedback").textContent="جرّب مجددًا وفكر في معنى المشهد."}})}
function resetBuilder(){state.answer=[];drawBuilder()}
function drawBuilder(){let original=activeScene().en.trim().split(/\s+/);let chosen=state.answer;let available=original.map((w,i)=>({w,i})).filter(x=>!chosen.includes(x.i));available=shuffle(available);$("answerBank").innerHTML=chosen.length?chosen.map((n,i)=>'<button data-undo="'+i+'">'+escapeHtml(original[n])+'</button>').join(""):'<span class="muted">انقر الكلمات لتكوين الجملة</span>';
 $("tokenBank").innerHTML=available.map(x=>'<button data-word="'+x.i+'">'+escapeHtml(x.w)+'</button>').join("");
 document.querySelectorAll("[data-word]").forEach(b=>b.onclick=()=>{let i=+b.dataset.word;if(i!==chosen.length){toast("اختر الكلمة التالية في الترتيب.");return}chosen.push(i);drawBuilder();if(chosen.length===original.length){$("builderFeedback").textContent="ممتاز! بنيت الجملة كاملة دون مساعدة ✓";markComplete()}});
 document.querySelectorAll("[data-undo]").forEach(b=>b.onclick=()=>{state.answer=state.answer.slice(0,+b.dataset.undo);drawBuilder()})}
function depthClass(d){return d==="advanced"?"advanced":d==="intermediate"?"intermediate":""}
function categoryName(id){return CORPUS.categories.find(x=>x.id===id)?.ar||id}
function renderFilters(){let sel=$("categorySelect");sel.innerHTML='<option value="">كل التصنيفات</option>'+CORPUS.categories.map(c=>'<option value="'+c.id+'">'+escapeHtml(c.ar)+'</option>').join("");sel.value=state.category;
 $("categoryChips").innerHTML='<button data-cat="" class="'+(!state.category?"active":"")+'">الكل</button>'+CORPUS.categories.map(c=>'<button data-cat="'+c.id+'" class="'+(state.category===c.id?"active":"")+'">'+escapeHtml(c.ar)+'</button>').join("");document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;state.visible=28;sel.value=state.category;renderFilters();renderCatalog()})}
function filteredPatterns(){let q=$("search").value.trim().toLowerCase(),cat=$("categorySelect").value,depth=$("depthSelect").value,unique=$("uniqueOnly").checked;return CORPUS.patterns.filter(x=>(!unique||!x.duplicateOf)&&(!cat||x.tags.includes(cat))&&(!depth||x.depth===depth)&&(!q||(String(x.id)+" "+x.en+" "+x.rule+" "+x.tags.map(categoryName).join(" ")+" "+(x.keywords||[]).join(" ")).toLowerCase().includes(q)))}
function renderCatalog(){let arr=filteredPatterns();$("resultCount").textContent=arr.length+" نتيجة من "+CORPUS.patterns.length;$("catalogGrid").innerHTML=arr.slice(0,state.visible).map(p=>'<article class="patternItem"><div class="head"><span class="pill">#'+p.id+'</span><span class="deepTag '+depthClass(p.depth)+'">'+deepNames[p.depth]+'</span></div><h3 lang="en">'+escapeHtml(p.en)+'</h3><p>'+escapeHtml(p.rule)+'</p><div class="tags">'+p.tags.map(t=>'<span>'+escapeHtml(categoryName(t))+'</span>').join("")+'</div><div class="tags keywordRow">'+(p.keywords||[]).slice(0,5).map(k=>'<button class="keyChip" data-keyword="'+escapeHtml(k)+'">'+escapeHtml(k)+'</button>').join("")+'</div><div class="buttons"><button class="btn tiny" data-open="'+p.id+'">تفاصيل وشرح</button><button class="btn tiny" data-voice="'+p.id+'">▶ نطق</button>'+(p.id<=3?'<button class="btn tiny primary" data-lessonId="'+(p.id-1)+'">دروس المشاهد</button>':"")+'</div></article>').join("")||'<div class="empty">لم نعثر على نتائج بهذه المرشحات. جرّب كلمة أوسع.</div>';
 $("showMore").style.display=state.visible>=arr.length?"none":"inline-flex";document.querySelectorAll("[data-keyword]").forEach(b=>b.onclick=()=>{$("search").value=b.dataset.keyword;state.visible=28;renderCatalog()});document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openPattern(+b.dataset.open));document.querySelectorAll("[data-voice]").forEach(b=>b.onclick=()=>{let p=CORPUS.patterns.find(x=>x.id===+b.dataset.voice);if(p)playAudio(null,p.en)});document.querySelectorAll("[data-lessonId]").forEach(b=>b.onclick=()=>chooseLesson(+b.dataset.lessonId))}
function openPattern(id){let p=CORPUS.patterns.find(x=>x.id===id);if(!p)return;state.modal=p;$("modalId").textContent="المصدر الأصلي #"+p.id+" · "+deepNames[p.depth];$("modalEn").textContent=p.en;$("modalRule").textContent=p.rule;$("modalTags").innerHTML=p.tags.map(t=>'<span class="pill">'+escapeHtml(categoryName(t))+'</span>').join(" ");$("modalRelated").style.display=p.id<=3?"inline-flex":"none";$("modalNeighbors").innerHTML="<h3>أنماط قريبة من هذا المدخل</h3><p class=\"muted\">علاقات مقترحة آليًا؛ تحتاج مراجعة دلالية.</p>"+(p.relatedIds||[]).map(id=>{let x=CORPUS.patterns.find(q=>q.id===id);return x?'<button class="btn tiny" data-neighbor="'+id+'">#'+id+" · "+escapeHtml(x.en)+"</button>":""}).join(" ");document.querySelectorAll("[data-neighbor]").forEach(n=>n.onclick=()=>openPattern(+n.dataset.neighbor));if(!$("patternDialog").open)$("patternDialog").showModal()}
function renderCompare(){const items=[["This is / That is","This is my house. / That is my house.","قريب / بعيد",0],["Have / Have got","I have a job. / I've got a job.","معنى الملكية أو الوجود؛ فروق في الصياغة والسياق",1],["Have / Have to","I have a job. / I have to work.","الامتلاك يختلف عن الضرورة",1],["Have got / Have got to","I've got a ticket. / I've got to leave.","ملكية مقابل ضرورة",2],["This is + want to","This is the house I want to buy.","اشِر ثم أضف رغبتك",0],["If + have + can","If you have time, we can talk.","الشرط ثم الإمكان",1]];
 $("connectGrid").innerHTML=items.map(x=>'<article class="connectItem"><div class="pill">'+escapeHtml(x[0])+'</div><div class="equation">'+escapeHtml(x[1])+'</div><p>'+escapeHtml(x[2])+'</p><button class="btn tiny primary" data-link="'+x[3]+'">شاهد تطبيقًا عمليًا</button></article>').join("");document.querySelectorAll("[data-link]").forEach(b=>b.onclick=()=>chooseLesson(+b.dataset.link))}

let STORIES={lessons:{}},storyPlayToken=0;
function markWord(target,text,idx){
 if(!target||!target.isConnected)return;
 const words=text.trim().split(/\s+/);
 target.innerHTML=words.map((w,i)=>i===idx?'<span class="speakingWord">'+escapeHtml(w)+'</span>':escapeHtml(w)).join(" ");
 if(target.id==="sentenceEn"){const bubble=$("sceneBubble");if(bubble&&bubble.isConnected)bubble.innerHTML=target.innerHTML}
 window.PATTERN_READ_ALONG?.update(target,text,idx);
}
function storyLines(){
 const d=STORIES.lessons[activeLesson().id];
 if(!d)return [];
 return $("storyMode").value==="dialogue"?d.dialogue:d.levels[state.depth].lines;
}
function renderStory(){
 if(!$("storyList")||!STORIES.lessons[activeLesson().id])return;
 const lesson=STORIES.lessons[activeLesson().id],isDialogue=$("storyMode").value==="dialogue",part=lesson.levels[state.depth],items=storyLines();
 $("storyHeading").textContent="📖 "+lesson.title;
 $("storySummary").textContent=lesson.ar+" · خمسة مواقف مترابطة في كل مستوى، وحوار قابل للاستماع";
 $("storyChapter").textContent=isDialogue?"🎭 حوار بين شخصين":("الفصل "+(state.depth+1)+" · "+part.title+" — "+part.ar);
 $("introDownload").href=resolvePreviewAudio("assets/audio/"+activeLesson().id+"/intro.mp3");
 $("storyAudioState").textContent="استمع للنطق الطبيعي المسجل عند توفره؛ البديل صوت الجهاز. تلوين MP3 يعمل فقط عندما تتوفر توقيتات صوتية مقاسة للتسجيل نفسه؛ وإلا لا نعرض تلوينًا تخمينيًا.";
 $("storyList").innerHTML=items.map((x,i)=>{
 const pos=photoStyle(activeLesson().id,storyPhotoIndex(activeLesson().id,x));
 const speaker=isDialogue?'<span class="storySpeaker">'+(i%2?"المتحدث B":"المتحدث A")+"</span>":"";
 return '<button type="button" class="storyLine" data-story-index="'+i+'" aria-label="استمع للجملة '+(i+1)+'"><span class="storyMini" style="'+pos+'"></span><span class="storyText">'+speaker+'<span class="storyEnglish" lang="en" dir="ltr">'+escapeHtml(x.en)+'</span><span class="storyArabic">'+escapeHtml(x.ar)+'</span></span></button>';
 }).join("");
 document.querySelectorAll("[data-story-index]").forEach(b=>b.onclick=()=>{storyPlayToken++;playStoryLine(+b.dataset.storyIndex,false,storyPlayToken)});
}
function playStoryLine(i,all=false,session=storyPlayToken){
 if(session!==storyPlayToken)return;
 const list=storyLines(),x=list[i];if(!x)return;
 document.querySelectorAll(".storyLine").forEach(b=>b.classList.toggle("playing",+b.dataset.storyIndex===i));
 const target=$('storyList').querySelector('[data-story-index="'+i+'"] .storyEnglish');
 const isDialogue=$("storyMode").value==="dialogue";
 const file="assets/audio/"+activeLesson().id+"/"+(isDialogue?"dialogue-"+(i+1):"story-"+(state.depth+1)+"-"+(i+1))+".mp3";
 $("storyAudioState").textContent="يتم تشغيل تسجيل Kokoro إن كان موجودًا، وإلا يُستخدم صوت المتصفح الإنجليزي؛ وإبراز الكلمات فقط عند توفر حدود الكلمات المتحقّق منها.";
 playAudio(file,x.en,false,()=>{if(session!==storyPlayToken)return;markWord(target,x.en,-1);if(all&&i+1<list.length){setTimeout(()=>{if(session===storyPlayToken)playStoryLine(i+1,true,session)},450)}else document.querySelectorAll(".storyLine").forEach(b=>b.classList.remove("playing"))},target);
}

async function init(){
 try{const [lr,pr,sr]=await Promise.all([fetch("data/lessons.json"),fetch("data/patterns.json"),fetch("data/stories.json")]);if(!lr.ok||!pr.ok)throw Error("HTTP "+lr.status+" / "+pr.status);const l=await lr.json(),p=await pr.json();LIB=l.lessons;CORPUS=p;STORIES=sr.ok?await sr.json():{lessons:{}};renderStats();renderStudy();renderFilters();window.PATTERN_CURRICULUM?.mount(CORPUS)}catch(e){document.querySelector(".layout").innerHTML='<div class="empty"><h2>تعذر تحميل محتوى التطبيق</h2><p>افتح التطبيق عبر GitHub Pages أو خادم HTTP محلي. لا يعمل تحميل JSON مباشرة باستخدام عنوان file:// في أغلب المتصفحات.</p><p dir="ltr">'+escapeHtml(e.message)+'</p></div>';return}
 document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>go(b.dataset.view));if(location.hash==="#group-one")go("group-one");else if(location.hash==="#group-two")go("group-two");$("heroStart").onclick=()=>$("study").scrollIntoView({behavior:"smooth",block:"start"});
 $("sceneArt").tabIndex=0;$("sceneArt").setAttribute("aria-label","اضغط على المشهد لسماع الجملة الإنجليزية");$("sceneArt").onclick=()=>playCurrent(false);$("sceneArt").onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();playCurrent(false)}};$("sceneAudio").onclick=()=>playCurrent(false);$("slowAudio").onclick=()=>playAudio(audioFile("scene"),activeScene().en,true,null,$("sentenceEn"));$("explanationAudio").onclick=playIntro;
 $("storyMode").onchange=()=>{storyPlayToken++;stopAudio();renderStory()};$("storyAll").onclick=()=>{storyPlayToken++;playStoryLine(0,true,storyPlayToken)};$("storyStop").onclick=()=>{storyPlayToken++;stopAudio();document.querySelectorAll(".storyLine").forEach(x=>x.classList.remove("playing"))};
 $("prevScene").onclick=()=>move(-1);$("nextScene").onclick=()=>move(1);$("resetWords").onclick=resetBuilder;
 $("autoplay").onclick=()=>{stopAudio();state.auto=!state.auto;$("autoplay").textContent="⟳ تسلسل المشاهد: "+(state.auto?"مفعّل":"مغلق");if(state.auto)playCurrent(true)};
 $("reviewAudio").onclick=()=>playAudio(null,activeLevel().scenes.map(x=>x.en).join(" ... "));
 $("search").oninput=()=>{state.visible=28;renderCatalog()};$("categorySelect").onchange=()=>{state.category=$("categorySelect").value;state.visible=28;renderFilters();renderCatalog()};$("depthSelect").onchange=()=>{state.visible=28;renderCatalog()};$("uniqueOnly").onchange=()=>{state.visible=28;renderCatalog()};$("showMore").onclick=()=>{state.visible+=28;renderCatalog()};
 $("modalClose").onclick=()=>$("patternDialog").close();$("modalStudy").onclick=()=>{if(state.modal){const id=state.modal.id;$("patternDialog").close();go("paths");window.PATTERN_CURRICULUM?.select(id)}};$("modalSpeak").onclick=()=>state.modal&&playAudio(null,state.modal.en);$("modalRelated").onclick=()=>{if(state.modal&&state.modal.id<=3){let i=state.modal.id-1;$("patternDialog").close();chooseLesson(i)}};
 document.addEventListener("keydown",e=>{if(state.view!=="learn"||e.target.matches("input,select,button")||e.ctrlKey||e.altKey)return;if(e.key==="ArrowLeft"){e.preventDefault();move(1)}if(e.key==="ArrowRight"){e.preventDefault();move(-1)}});
}
init();
