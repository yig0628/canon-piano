(()=>{"use strict";
const $=s=>document.querySelector(s);
const data={score:null,mode:"B",segment:0,pos:0,groups:[],matched:new Set(),tempo:70,playing:false,audio:null,timer:null,session:0,bank:new Map(),bankPromise:null,install:null};
const S=[39,42,45,48,51,54,57,60,63,66,69,72,75,78,81,84,87,90,93];
const NN=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
const NUM={0:"♭7",1:"7",2:"1",4:"2",6:"3",7:"4",9:"5",11:"6"};
function name(n){return NN[n%12]+(Math.floor(n/12)-1)}
function number(n){let o=Math.floor(n/12)-1;return (NUM[n%12]||"♯")+(o>=5?"↑":o<=3?"↓":"")}
function ctx(){const C=window.AudioContext||window.webkitAudioContext;if(!C){$("#audio-ready").textContent="이 브라우저는 소리를 지원하지 않아.";return null}if(!data.audio)data.audio=new C();if(data.audio.state==="suspended")data.audio.resume().catch(()=>{});return data.audio}
function preload(){if(data.bankPromise)return data.bankPromise;let a=ctx();if(!a)return Promise.reject(new Error("no audio"));let count=0;
 data.bankPromise=Promise.all(S.map(async n=>{let res=await fetch("./piano-samples/"+n+".mp3");if(!res.ok)throw Error("sample "+n);let buf=await a.decodeAudioData(await res.arrayBuffer());data.bank.set(n,buf);$("#audio-ready").textContent="♪ 그랜드피아노 음색 로딩 "+(++count)+"/"+S.length})).then(()=>{$("#audio-ready").textContent="♪ 실제 그랜드피아노 음색 준비 완료"}).catch(()=>{$("#audio-ready").textContent="♪ 일부 음원 로딩 실패 · 인터넷 연결 확인"});return data.bankPromise}
function playNote(n,t,d=.7,vel=.7){let a=ctx();if(!a)return;let nearest=S.filter(k=>data.bank.has(k)).sort((x,y)=>Math.abs(x-n)-Math.abs(y-n))[0];
 if(nearest==null){preload();return;}
 let src=a.createBufferSource(),g=a.createGain(),rate=Math.pow(2,(n-nearest)/12);src.buffer=data.bank.get(nearest);src.playbackRate.value=rate;
 let attack=Math.max(a.currentTime+.001,t),hold=Math.max(.25,d);
 g.gain.setValueAtTime(.0001,attack);g.gain.exponentialRampToValueAtTime(.66*vel,attack+.009);g.gain.setTargetAtTime(.5*vel,attack+.02,.45);g.gain.setTargetAtTime(.0001,attack+hold,.085);
 src.connect(g).connect(a.destination);src.start(attack);src.stop(Math.min(attack+hold+.55,attack+src.buffer.duration/rate-.05));
}
function target(){return data.groups[data.pos]?.notes||[]}
function stop(){data.session++;if(data.timer)clearInterval(data.timer);data.timer=null;data.playing=false;$("#play").textContent="▶ 현재 구간 듣기"}
function reset(){stop();data.pos=0;data.matched.clear();$("#status").textContent="황금색 건반부터 눌러봐.";rebuild()}
function rebuild(){if(!data.score)return;let start=data.segment*32,end=Math.min(228,start+32),r=data.score.r,l=data.score.l,events=[];
 if(data.mode!=="L")r.forEach(([t,n,d])=>{if(t>=start&&t<end)events.push({t,n,d,h:"R"})});
 if(data.mode!=="R")l.forEach(([t,n,d])=>{if(t>=start&&t<end)events.push({t,n,d,h:"L"})});
 events.sort((x,y)=>x.t-y.t);let groups=[];for(const e of events){let prev=groups[groups.length-1];if(prev&&Math.abs(prev.t-e.t)<.001)prev.notes.push(e);else groups.push({t:e.t,notes:[e]})}data.groups=groups;render()}
function render(){let t=target(),l=t.filter(e=>e.h==="L"),r=t.filter(e=>e.h==="R");
 $("#bar-label").textContent=(data.segment*8+1)+"–"+Math.min(57,(data.segment+1)*8)+"마디";
 $("#progress").textContent=data.pos+" / "+data.groups.length+" 박자";
 $("#meter").style.width=(data.groups.length?100*data.pos/data.groups.length:0)+"%";
 for(const [h,a] of [["left",l],["right",r]]){$("#"+h+"-num").textContent=a.length?a.map(e=>number(e.n)).join(" + "):"—";$("#"+h+"-name").textContent=a.length?a.map(e=>name(e.n)).join(" · "):"쉼표"}
 $("#steps").innerHTML=data.groups.slice(Math.max(0,data.pos-2),data.pos+14).map(g=>'<div class="'+(g===data.groups[data.pos]?"now":"")+'"><b>'+((g.notes.filter(e=>e.h==="R").map(e=>number(e.n)).join("+"))||g.notes.map(e=>number(e.n)).join("+"))+'</b><small>'+(g.t/4+1).toFixed(1)+'</small></div>').join("");
 document.querySelectorAll(".keyboard button").forEach(b=>b.classList.remove("hint"));
 t.forEach(e=>{let b=document.querySelector('[data-hand="'+e.h+'"][data-note="'+e.n+'"]');if(b)b.classList.add("hint")});
 if(data.score&&data.pos>=data.groups.length)$("#status").textContent="🎉 구간 연습 완료! 다음 구간을 눌러봐."
}
function keyboard(id,h,lo,hi){let el=document.getElementById(id),white=[],black=[];for(let n=lo;n<=hi;n++)([1,3,6,8,10].includes(n%12)?black:white).push(n);
 el.style.width=(white.length*48)+"px";let html="";
 for(let n of white)html+='<button type="button" class="white" data-hand="'+h+'" data-note="'+n+'" aria-label="'+name(n)+'"><strong>'+number(n)+'</strong><small>'+name(n)+'</small></button>';
 for(let n of black)html+='<button type="button" class="black" style="left:'+(white.filter(w=>w<n).length*48-15)+'px" data-hand="'+h+'" data-note="'+n+'" aria-label="'+name(n)+'"><strong>'+number(n)+'</strong></button>';
 el.innerHTML=html;
 el.addEventListener("pointerdown",e=>{let b=e.target.closest("button[data-note]");if(!b)return;e.preventDefault();touch(h,+b.dataset.note,b)});
}
function touch(h,n,b){if(data.playing)return;const a=ctx();if(!a)return;if(data.bank.size===0){$("#status").textContent="피아노 소리 준비 중이야. 상단 로딩이 끝나면 눌러줘.";preload();return}playNote(n,a.currentTime+.015,.75,.84);b.classList.add("pressed");setTimeout(()=>b.classList.remove("pressed"),190);
 const t=target();if(!t.length)return;const k=h+":"+n;if(!t.some(e=>e.h===h&&e.n===n&&!data.matched.has(k))){$("#status").textContent="황금색 건반을 눌러봐.";return}
 data.matched.add(k);if(t.every(e=>data.matched.has(e.h+":"+e.n))){data.matched.clear();data.pos++;$("#status").textContent="정답! 다음 음으로 넘어가자."}else $("#status").textContent="같은 박자의 다른 음도 눌러줘.";render();
}
function auto(full){if(data.playing){stop();return}if(!data.score)return;if(data.bank.size===0){preload();$("#status").textContent="피아노 음색을 읽는 중…";return}let a=ctx();if(!a)return;stop();let token=data.session,begin=full?0:data.segment*32,end=full?228:Math.min(228,begin+32),rate=60/data.tempo,t0=a.currentTime+.15;
 let notes=[...data.score.r.map(([t,n,d])=>({t,n,d,h:"R"})),...data.score.l.map(([t,n,d])=>({t,n,d,h:"L"}))].filter(e=>e.t>=begin&&e.t<end).sort((x,y)=>x.t-y.t),i=0;
 data.playing=true;$("#play").textContent="■ 연주 정지";$("#status").textContent=full?"전곡 자동 연주 중…":"현재 구간 자동 연주 중…";
 data.timer=setInterval(()=>{if(data.session!==token)return;let now=a.currentTime;while(i<notes.length&&t0+(notes[i].t-begin)*rate<now+.22){let e=notes[i++];playNote(e.n,Math.max(now+.01,t0+(e.t-begin)*rate),e.d*rate*.9,e.h==="R"?.78:.42)}let t=begin+Math.max(0,(now-t0)/rate);
 if(!full){let j=data.groups.findIndex(g=>g.t>t);data.pos=j<0?data.groups.length:Math.max(0,j-1);render()}
 if(t>=end+.2){stop();data.pos=0;render();$("#status").textContent="연주 완료! 이제 직접 따라 쳐봐."}},70);
}
keyboard("left-board","L",43,67);keyboard("right-board","R",59,91);
Promise.resolve().then(()=>fetch("./score.json")).then(r=>{if(!r.ok)throw Error("score");return r.json()}).then(s=>{data.score=s;rebuild()}).catch(()=>$("#status").textContent="악보를 불러오지 못했어. 새로고침해줘.");
preload();
document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{data.mode=b.dataset.mode;document.querySelectorAll("[data-mode]").forEach(k=>k.classList.toggle("selected",k===b));$("#left-panel").hidden=data.mode==="R";$("#right-panel").hidden=data.mode==="L";reset()}));
$("#section").addEventListener("change",e=>{data.segment=+e.target.value;reset()});
$("#speed").addEventListener("input",e=>{data.tempo=+e.target.value;$("#bpm").textContent=data.tempo+" BPM"});
$("#play").addEventListener("click",()=>auto(false));$("#full-play").addEventListener("click",()=>auto(true));$("#restart").addEventListener("click",reset);
$("#next").addEventListener("click",()=>{data.segment=Math.min(7,data.segment+1);$("#section").value=String(data.segment);reset()});
$("#share").addEventListener("click",()=>{if(navigator.share)navigator.share({title:"캐논 터치 피아노",url:location.href}).catch(()=>{});else navigator.clipboard?.writeText(location.href).then(()=>$("#status").textContent="공유 링크 복사 완료")});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();data.install=e;$("#install").textContent="앱 설치"});
$("#install").addEventListener("click",()=>{if(data.install){data.install.prompt();data.install=null}else $("#status").textContent="Chrome 오른쪽 ⋮ 메뉴 → 홈 화면에 추가 → 설치"});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();
