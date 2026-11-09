/* =========================================================
   APPT Core v3.0 — no password; visual parity with queue ticket
   (reuses queue system style.css classes for header & font)
   Porting: replace the DB layer (6 methods) only.
   ========================================================= */
window.APPT = (function () {
  'use strict';
  const CFG = window.APPT_CONFIG;

  /* ---------- Inject print CSS (layout only; font & header come from style.css) ---------- */
  (function injectCSS(){
    const s = document.createElement('style');
    s.id = 'appt-css';
    s.textContent = `
      #printArea{display:none}
      @media print{
        body *{visibility:hidden}
        #printArea,#printArea *{visibility:visible}
        #printArea{display:block;position:absolute;left:0;top:0;width:${CFG.paper.width};padding:0 ${CFG.paper.margin};box-sizing:border-box}
        /* Min height 14cm; grows automatically if content overflows */
        #printArea .s-page{min-height:${CFG.paper.minHeight};box-sizing:border-box;display:flex;flex-direction:column}
        #printArea .s-title{font-size:18px;font-weight:900;text-align:center;margin:4px 0 6px;letter-spacing:1px}
        /* Borderless table; label left, value right; auto wrap, no shrink */
        #printArea .s-table{width:100%;border-collapse:collapse}
        #printArea .s-table th,#printArea .s-table td{border:none;padding:3px 4px;text-align:left;vertical-align:top;white-space:normal;word-break:break-word;overflow-wrap:anywhere}
        #printArea .s-table th{width:38%;font-weight:700}
        /* Divider above Remark */
        #printArea .s-div{border-top:1px solid #000;margin:5px 0 3px}
        #printArea .s-remark-label{font-weight:700}
        #printArea .s-remark-text{line-height:1.5;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere}
        /* Footer pinned to bottom (whitespace fills up to 14cm) */
        #printArea .s-foot{margin-top:auto;padding-top:6px;font-size:10px;line-height:1.5}
      }`;
    document.head.appendChild(s);
  })();

  /* ---------- Helpers ---------- */
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = (n,l) => String(n).padStart(l,'0');
  const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1,2)}-${pad(d.getDate(),2)}`; };
  const nowLabel = () => { const d=new Date(); return `${todayStr()} ${pad(d.getHours(),2)}:${pad(d.getMinutes(),2)}:${pad(d.getSeconds(),2)}`; };

  /* ========== DATA LAYER (replace when porting) ========== */
  let root = null;
  const DB = {
    _init(){ root = firebase.database().ref(CFG.root); },
    push(p,o){ return root.child(p).push(o); },
    set(p,v){ return root.child(p).set(v); },
    remove(p){ return root.child(p).remove(); },
    transaction(p,fn){ return root.child(p).transaction(fn); },
    on(p,cb){ root.child(p).on('value', s => cb(s.val())); },
    once(p){ return root.child(p).once('value').then(s => s.val()); }
  };
  /* ========================================================= */

  /* ---------- Records ---------- */
  async function createRecord(f){
    let no;
    await DB.transaction('seq', c => { no = (c||0)+1; return no; });
    const rec = Object.assign({}, f, { no: CFG.prefix+'-'+pad(no,3), createdAt: Date.now(), issued: nowLabel() });
    await DB.push('records', rec);
    await queuePrint({ type:'appt', rec: rec, copies: f.copies||1 });   // enqueue first, print later
    return rec;
  }
  function onRecords(cb){ DB.on('records', v => cb(v||{})); }
  function reprint(rec){ return queuePrint({ type:'appt', rec: rec, copies:1 }); }
  function queuePrint(job){ job.createdAt = job.createdAt||Date.now(); job.done = false; return DB.push('printQueue', job); }

  /* ---------- Slip template: English only, no number, no signature ----------
     Header reuses queue ticket classes (t-head / t-school-zh) so logo &
     school name size and font are identical to the queue ticket. */
  function slipHTML(r){
    const T = CFG.strings;
    const row = (label,val) => `<tr><th>${label}</th><td>${esc(val)||'—'}</td></tr>`;
    return `<div class="s-page">
      <div class="t-head"><img src="${CFG.logo}" alt="logo"><div>
        <div class="t-school-zh">${esc(CFG.school.en)}</div></div></div>
      <div class="s-title">${T.slipTitle}</div>
      <table class="s-table">
        ${row(T.fName, r.name)}
        ${row(T.fForm, r.form)}
        ${row(T.fClassNo, r.classNo)}
        ${row(T.fShouldSee, r.shouldSee)}
        ${row(T.fDate, r.date)}
        ${row(T.fTime, r.time)}
        ${row(T.fPlace, r.place)}
      </table>
      <div class="s-div"></div>
      <div class="s-remark-label">${T.fRemark}</div>
      <div class="s-remark-text">${esc(r.remark)||'—'}</div>
      <div class="s-foot">${T.footerNote}<br>${T.issuedAt}: ${esc(r.issued)}</div>
    </div>`;
  }

  /* ---------- Printer consumer (serialised, conflict-free) ---------- */
  function startPrinter(H){
    H = H || {};
    const jobs=[]; const seen={}; let printing=false;
    const log = m => H.onLog && H.onLog(m);
    const cnt = n => H.onCount && H.onCount(n);
    function area(){ let pa=document.getElementById('printArea'); if(!pa){ pa=document.createElement('div'); pa.id='printArea'; document.body.appendChild(pa); } return pa; }
    function enqueue(k,j){
      if (seen[k]) return; seen[k]=1;
      jobs.push(Object.assign({key:k},j)); cnt(jobs.length);
      log('Job received: '+((j.rec&&j.rec.no)||'?')); pump();
    }
    async function pump(){
      if (printing) return; printing=true;
      while (jobs.length){
        const j = jobs.shift(); cnt(jobs.length);
        await DB.remove('printQueue/'+j.key).catch(()=>{});
        area().innerHTML = slipHTML(j.rec||{});
        const copies = Math.max(1, j.copies||1);
        setTimeout(()=>{ for(let i=0;i<copies;i++) window.print(); log('✅ '+((j.rec&&j.rec.no)||'SLIP')+' x'+copies+' sent'); },250);
        await new Promise(r=>setTimeout(r,900));
      }
      printing=false;
    }
    DB.on('printQueue', v => { const all=v||{}; Object.keys(all).forEach(k=>{ const j=all[k]; if(j&&!j.done&&!seen[k]) enqueue(k,j); }); });
    log('Consumer started');
    return { testPrint(rec){ area().innerHTML = slipHTML(rec); setTimeout(()=>window.print(),250); } };
  }

  function init(){
    try{ firebase.initializeApp(CFG.firebase); }catch(e){}
    DB._init();
  }

  return { init, createRecord, onRecords, reprint, queuePrint, slipHTML, startPrinter, esc, todayStr, nowLabel, DB, CFG };
})();
