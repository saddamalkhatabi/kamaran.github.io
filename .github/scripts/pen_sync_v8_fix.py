from pathlib import Path
p=Path('pen/sync-v8.js')
s=p.read_text(encoding='utf-8')
old="function localScreen(clear){if(!connected||applying||!canAdmin())return;send({type:'screen',state:screenState(),clearDrawing:!!clear})}"
new="function localScreen(clear){if(!connected||applying||!canAdmin())return;var st=screenState();st.clearDrawing=!!clear;send({type:'screen',state:st})}"
if old not in s: raise SystemExit('localScreen marker missing')
s=s.replace(old,new,1)
old2="else if(m.type==='screen'&&core.applyScreen)core.applyScreen(m.state||{});"
new2="else if(m.type==='screen'&&core.applyScreen){core.applyScreen(m.state||{});updatePermissions();}"
if old2 not in s: raise SystemExit('apply screen marker missing')
s=s.replace(old2,new2,1)
p.write_text(s,encoding='utf-8')
print('fixed v8 screen synchronization')
