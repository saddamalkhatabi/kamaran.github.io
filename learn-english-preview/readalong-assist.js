/* Visible read-along when the active transcript is offscreen. No guessed timing.
 * All highlighting is driven by the exact same word index as the audible source.
 */
(function(win,doc){"use strict";
 var root=null, transcript=null, label=null, jump=null, close=null;
 var target=null,words=[],active=-1,muted=false,observing=false,visible=false,observer=null;
 var lastText="",scheduled=0,raf=win.requestAnimationFrame||function(fn){return win.setTimeout(fn,16)};
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
 function mount(){
   if(root)return;
   root=doc.createElement("aside");root.id="floatingReadAlong";root.className="floatingReadAlong";root.hidden=true;
   root.setAttribute("role","complementary");root.setAttribute("aria-label","مساعد القراءة المتزامنة مع الصوت");
   root.innerHTML='<div class="floatingReadingTop"><strong>🔊 متابعة النطق · Read along</strong><div><button type="button" class="floatingJump" aria-label="الانتقال لموضع النص">↗ النص</button><button type="button" class="floatingDismiss" aria-label="إغلاق مساعد القراءة">×</button></div></div><p class="floatingWords" lang="en" dir="ltr"></p>';
   doc.body.appendChild(root);
   transcript=root.querySelector(".floatingWords");jump=root.querySelector(".floatingJump");close=root.querySelector(".floatingDismiss");
   jump.addEventListener("click",function(){if(target&&target.isConnected){target.scrollIntoView({behavior:"smooth",block:"center"});}});
   close.addEventListener("click",function(){muted=true;renderVisibility()});
   win.addEventListener("scroll",schedule,{passive:true,capture:true});
   win.addEventListener("resize",schedule,{passive:true});
 }
 function targetVisible(){
   if(!target||!target.isConnected)return false;
   var style=win.getComputedStyle?win.getComputedStyle(target):null;
   if(style&&(style.display==="none"||style.visibility==="hidden"))return false;
   var rect=target.getBoundingClientRect(),vh=win.innerHeight||doc.documentElement.clientHeight,vw=win.innerWidth||doc.documentElement.clientWidth;
   if(rect.height<=0||rect.width<=0||rect.bottom<90||rect.top>vh-72||rect.right<0||rect.left>vw)return false;
   var top=Math.max(90,rect.top), bottom=Math.min(vh-72,rect.bottom);
   if((bottom-top)/Math.max(1,rect.height)<.32)return false;
   // A transcript clipped by any scrollable ancestor is not visually accessible.
   var parent=target.parentElement;
   while(parent&&parent!==doc.body){
     var css=win.getComputedStyle?win.getComputedStyle(parent):null;
     if(css&&/(auto|scroll|hidden|clip)/.test(css.overflowY||"")){
       var box=parent.getBoundingClientRect();
       top=Math.max(top,box.top);bottom=Math.min(bottom,box.bottom);
       if(bottom<=top)return false;
     }
     parent=parent.parentElement;
   }
   return (bottom-top)/Math.max(1,rect.height)>=.30;
 }
 function schedule(){if(scheduled)return;scheduled=raf(function(){scheduled=0;renderVisibility()})}
 function renderVisibility(){
   if(!root)return;
   var shouldShow=!!(target&&target.isConnected&&words.length&&!muted&&!targetVisible());
   root.hidden=!shouldShow;
   if(shouldShow&&doc.activeElement===root)root.blur();
 }
 function redraw(){
   if(!transcript)return;
   transcript.innerHTML=words.map(function(w,i){return '<span class="floatingToken'+(i===active?' isSpeaking':'')+'">'+esc(w)+'</span>'}).join(" ");
   if(active>=0){var node=transcript.children[active];if(node){
     var p=transcript.getBoundingClientRect(),r=node.getBoundingClientRect();
     if(r.top<p.top||r.bottom>p.bottom||r.left<p.left||r.right>p.right)node.scrollIntoView({block:"nearest",inline:"nearest"});
   }}
   renderVisibility();
 }
 function begin(el,text){
   mount();target=el;lastText=String(text||"").trim();words=lastText?lastText.split(/\s+/):[];active=-1;muted=false;
   redraw();
 }
 function update(el,text,index){
   if(!el||!el.isConnected)return;
   if(target!==el||lastText!==String(text||"").trim())begin(el,text);
   if(index!==active){active=index;redraw()}else schedule();
 }
 function end(){target=null;words=[];lastText="";active=-1;muted=false;if(root)root.hidden=true}
 function refresh(){schedule()}
 win.PATTERN_READ_ALONG={begin:begin,update:update,end:end,refresh:refresh,isOpen:function(){return !!root&&!root.hidden}};
})(window,document);
