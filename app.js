'use strict';
const $=id=>document.getElementById(id);
let cache={},all=[],pool=[],session=[],idx=0,ok=0,bad=0,wrongRound=[],round=0,locked=false,active=false,sessionMode='E2C',firstResult='',autoReview=true,sourceLabel='';
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
let wrong=read('vt_wrong',[]);if(!Array.isArray(wrong))wrong=[];
let history=read('vt_history',[]);if(!Array.isArray(history))history=[];
function persist(){try{localStorage.setItem('vt_wrong',JSON.stringify(wrong));localStorage.setItem('vt_history',JSON.stringify(history))}catch{$('storageNote').textContent='瀏覽器無法保存紀錄；關閉頁面後可能遺失。'}}
function key(x){return x.word+'|'+x.definition}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function unique(a){return [...new Map(a.map(x=>[key(x),x])).values()]}
function syncWrong(){ $('review').textContent=`錯題本（${wrong.length}）`;$('review').disabled=!wrong.length}
function info(){const p=cache[$('level').value]||[];$('poolInfo').textContent=`可練習 ${p.length} 個詞條 · 本次抽題不重複`}
function start(review=false){if(active&&!confirm('重新開始會結束這次測驗，要繼續嗎？'))return;
 pool=review?unique(wrong):cache[$('level').value]||[];if(!pool.length)return;
 session=shuffle(pool).slice(0,$('count').value==='all'?pool.length:Number($('count').value));sessionMode=$('mode').value;autoReview=$('auto').checked;sourceLabel=review?'錯題本':$('level').value;round=0;firstResult='';active=true;beginRound();}
function beginRound(){idx=0;ok=0;bad=0;wrongRound=[];$('summary').textContent='';render()}
function answerText(x){return sessionMode==='E2C'?x.definition:x.word}
function render(){const it=session[idx];locked=false;$('stage').textContent=round?`錯題複習 · 第 ${round} 輪`:`${sourceLabel} · 首次測驗`;
 $('progressText').textContent=`${idx+1} / ${session.length}`;$('score').textContent=`答對 ${ok} · 答錯 ${bad}`;$('progress').value=idx/session.length*100;
 $('prompt').textContent=sessionMode==='E2C'?it.word:it.definition;$('ipa').textContent=sessionMode==='E2C'?(it.ipa||''):'';
 $('feedback').textContent='';$('choices').replaceChildren();$('next').classList.add('hidden');$('reveal').classList.remove('hidden');$('spellForm').classList.toggle('hidden',sessionMode!=='SPELL');$('spelling').value='';$('spelling').disabled=false;$('spellForm').querySelector('button').disabled=false;
 if(sessionMode==='SPELL'){$('spelling').focus();return}
 const correct=answerText(it);const seen=new Set([correct]);const candidates=shuffle([...pool,...all]).filter(x=>{const t=answerText(x);if(x.word===it.word||seen.has(t))return false;seen.add(t);return true}).slice(0,3);
 shuffle([it,...candidates]).forEach((x,i)=>{const b=document.createElement('button');b.className='choice';b.textContent=`${i+1}. ${answerText(x)}`;b.dataset.answer=answerText(x);b.onclick=()=>grade(answerText(x)===correct,b);$('choices').append(b)})}
function grade(correct,button){if(!active||locked)return;locked=true;const it=session[idx];if(correct){ok++;wrong=wrong.filter(x=>key(x)!==key(it))}else{bad++;wrongRound.push(it);wrong=unique([...wrong,it]);if(button)button.classList.add('wrong')}
 for(const b of $('choices').children){b.disabled=true;if(b.dataset.answer===answerText(it))b.classList.add('correct')}
 $('spelling').disabled=true;$('spellForm').querySelector('button').disabled=true;$('feedback').textContent=`${correct?'✓ 答對了':'✕ 已記入錯題'}　${it.word} ${it.ipa||''} — ${it.definition}`;
 $('score').textContent=`答對 ${ok} · 答錯 ${bad}`;$('progress').value=(idx+1)/session.length*100;$('reveal').classList.add('hidden');$('next').classList.remove('hidden');$('next').textContent=idx+1===session.length?'完成本輪 →':'下一題 →';persist();syncWrong()}
function finish(){const rate=Math.round(ok/session.length*100);if(!round){firstResult=`首次測驗：${session.length} 題，答對 ${ok} 題，正確率 ${rate}%。`;history.unshift({date:new Date().toLocaleString('zh-TW'),text:firstResult});history=history.slice(0,20);persist();showHistory()}
 if(wrongRound.length&&autoReview){const n=wrongRound.length;round++;session=shuffle(wrongRound);beginRound();$('feedback').textContent=`上一輪還有 ${n} 題不熟，現在開始複習。${firstResult}`;return}
 active=false;$('prompt').textContent=wrongRound.length?'這一輪完成了。':'這次的單字都答對了！';$('ipa').textContent='';$('choices').replaceChildren();$('spellForm').classList.add('hidden');$('next').classList.add('hidden');$('reveal').classList.add('hidden');$('feedback').textContent='';$('summary').textContent=firstResult+(round?` 已完成 ${round} 輪錯題複習。`:'')+(wrongRound.length?` 還有 ${wrongRound.length} 題留在錯題本。`:' 可以開始下一次練習。');}
function showHistory(){$('history').textContent=history.length?`最近測驗 · ${history[0].date} · ${history[0].text}`:'題庫來源：你上傳的大考中心詞彙表。'}
$('start').onclick=()=>start();$('review').onclick=()=>start(true);$('level').onchange=info;
$('next').onclick=()=>{if(!locked)return;if(idx+1===session.length)finish();else{idx++;render()}};
$('reveal').onclick=()=>grade(false);
$('spellForm').onsubmit=e=>{e.preventDefault();if(!$('spelling').value.trim())return;const ans=$('spelling').value.trim().toLowerCase();const word=session[idx].word.toLowerCase();const variants=[word,...word.split('/'),word.replace(/\([^)]*\)/g,'')];grade(variants.includes(ans))};
function tab(roots){$('quizView').classList.toggle('hidden',roots);$('rootsView').classList.toggle('hidden',!roots);$('quizTab').classList.toggle('active',!roots);$('rootsTab').classList.toggle('active',roots)}
$('quizTab').onclick=()=>tab(false);$('rootsTab').onclick=()=>tab(true);
const roots=[['trans-','穿越／轉換','transmit, transition, transcript, transformation'],['pre-','在前／預先','prediction, predecessor, prescription'],['dis-','不／分開','distrust, disable, displace'],['sub-','在下／次級','subordinate, subsequent, suburban'],['dict','說／命令','dictate, dictator, contradict'],['tract','拉','distract, extract, abstraction'],['scrib / script','寫','prescribe, subscribe, transcript'],['ject','投／丟','inject, projection, subjective'],['cred','相信','credible, credibility'],['vert / vers','轉','divert, diversion, diversity'],['-tion / -sion','名詞','transmission, contradiction'],['-ment','名詞','assessment, commitment'],['-ity','名詞','credibility, diversity'],['-able / -ible','形容詞','accessible, applicable, credible'],['-ize / -ify','動詞','authorize, civilize, diversify, unify']];
for(const [root,meaning,examples]of roots){const card=document.createElement('div');card.className='root';const b=document.createElement('b');b.textContent=root;const m=document.createElement('p');m.textContent=meaning;const e=document.createElement('p');e.className='muted';e.textContent=examples;card.append(b,m,e);$('rootCards').append(card)}
async function init(){try{const res=await fetch('./vocab_cache.json');if(!res.ok)throw Error(res.status);const raw=await res.json();for(const [lv,items]of Object.entries(raw)){cache[lv]=unique(items.map(x=>{let definition=x.definition||x.answer||'',ipa=x.ipa||'';const m=definition.match(/^\[([^\]]+)\](.*)$/s);if(m){ipa=ipa||`[${m[1]}]`;definition=m[2]}return{word:x.word,definition:definition.trim(),ipa}}).filter(x=>x.word&&x.definition))}
 all=Object.values(cache).flat();$('level').replaceChildren();for(const lv of Object.keys(cache).sort()){const o=document.createElement('option');o.value=lv;o.textContent=lv;$('level').append(o)}$('level').value=cache['Level 6']?'Level 6':Object.keys(cache)[0];$('start').disabled=false;$('start').textContent='開始練習 →';syncWrong();info();showHistory()}catch{$('prompt').textContent='題庫載入失敗';$('feedback').textContent='請重新整理頁面，或稍後再試。';$('start').textContent='重新載入';$('start').disabled=false;$('start').onclick=()=>location.reload()}}
init();
