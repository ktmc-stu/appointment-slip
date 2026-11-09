/* =========================================================
   APPT Core v2.0 — 無密碼版・Appointment Slip 遙控列印核心庫
   Porting: 只需替換「資料層 DB」的 6 個方法即可換後端。
   ========================================================= */
window.APPT = (function () {
  'use strict';
  const CFG = window.APPT_CONFIG;

  /* ---------- 注入列印樣式 Inject print CSS ---------- */
  (function injectCSS(){
    const s = document.createElement('style');
    s.id = 'appt-css';
    s.textContent = `
      #apptPrintArea{display:none}
      @media print{
        body *{visibility:hidden}
        #apptPrintArea,#apptPrintArea *{visibility:visible}
        #apptPrintArea{display:block;position:absolute;left:0;top:0;width:${CFG.paper.width};padding:0 ${CFG.paper.margin};box-sizing:border-box;font-family:"Noto Sans TC","PingFang HK","Microsoft JhengHei",sans-serif;color:#000;font-size:13px}
        /* 最小高度 14cm；內容超長自動加長 Min height 14cm; grows if content overflows */
        #apptPrintArea .s-page{min-height:${CFG.paper.minHeight};box-sizing:border-box;display:flex;flex-direction:column}
        #apptPrintArea .s-head{display:flex;align-items:center;gap:6px;justify-content:center}
        #apptPrintArea .s-head img{width:40px;height:40px}
        #apptPrintArea .s-school-zh{font-weight:800;font-size:14px}
        #apptPrintArea .s-school-en{font-size:9px}
        #apptPrintArea .s-title{font-size:20px;font-weight:900;text-align:center;margin:4px 0 0}
        #apptPrintArea .s-no{font-size:24px;font-weight:900;text-align:center;margin:2px 0 6px;letter-spacing:2px}
        /* 左名稱・右資料；自動換行、不縮字、不越界 */
        #apptPrintArea .s-table{width:100%;border-collapse:collapse}
        #apptPrintArea .s-table th,#apptPrintArea .s-table td{border:1px solid #000;padding:4px 6px;text-align:left;vertical-align:top;white-space:normal;word-break:break-word;overflow-wrap:anywhere}
        #apptPrintArea .s-table th{width:38%;font-weight:800}
        /* Remark 分割線 Divider above Remark */
        #apptPrintArea .s-div{border-top:1px solid #000;margin:6px 0 4px}
        #apptPrintArea .s-remark-label{font-weight:800;font-size:12px}
        #apptPrintArea .s-remark-text{font-size:13px;line-height:1.6;margin-top:2px;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere}
        /* 頁尾置底（留白補足 14cm） Footer pinned to bottom */
        #apptPrintArea .s-foot{margin-top:auto;padding-top:6px;font-size:10px;line-height:1.6;border-top:1px dashed #000}
      }`;
    document.head.appendChild(s);
  })();

  /* ---------- 通用輔助 Helpers ---------- */
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = (n,l) => String(n).padStart(l,'0');
  const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1,2)}-${pad(d.getDate(),2)}`; };
  const nowLabel = () => { const d=new Date(); return `${todayStr()} ${pad(d.getHours(),2)}:${pad(d.getMinutes(),2)}:${pad(d.getSeconds(),2)}`; };

  /* ========== 資料層 DATA LAYER（移植時替換此區塊） ==========
     合約 Contract（全部回傳 Promise）:
       push(path,obj) / set(path,val) / remove(path)
       transaction(path,fn) / on(path,cb) / once(path)
     目前實現 Implementation: Firebase Realtime Database
     ========================================================= */
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

  /* ---------- 業務：記錄 Records ---------- */
  async function createRecord(f){
    let no;
    await DB.transaction('seq', c => { no = (c||0)+1; return no; });
    const rec = Object.assign({}, f, { no: CFG.prefix+'-'+pad(no,3), createdAt: Date.now(), issued: nowLabel() });
    await DB.push('records', rec);
    /* 先入隊列，再由打印機端列印 Enqueue first; printer consumer prints later */
    await queuePrint({ type:'appt', rec: rec, copies: f.copies||1 });
    return rec;
  }
  function onRecords(cb){ DB.on('records', v => cb(v||{})); }
  function reprint(rec){ return queuePrint({ type:'appt', rec: rec, copies:1 }); }

  /* ---------- 列印隊列 Print queue ----------
     工作合約 Job contract: { type:'appt', rec:{...}, copies:n, createdAt:ms, done:false } */
  function queuePrint(job){ job.createdAt = job.createdAt||Date.now(); job.done = false; return DB.push('printQueue', job); }

  /* ---------- 憑條模板 Slip template（純函式 pure function） ---------- */
  function slipHTML(r){
    const S = CFG.school, T = CFG.strings;
    const row = (label,val) => `<tr><th>${label}</th><td>${esc(val)===''?'—':esc(val)}</td></tr>`;
    return `<div class="s-page">
      <div class="s-head"><img src="${CFG.logo}" alt="logo"><div>
        <div class="s-school-zh">${esc(S.zh)}</div><div class="s-school-en">${esc(S.en)}</div></div></div>
      <div class="s-title">${T.slipTitle}</div>
      <div class="s-no">${esc(r.no)}</div>
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
      <div class="s-remark">
        <div class="s-remark-label">${T.fRemark}</div>
        <div class="s-remark-text">${esc(r.remark)===''?'—':esc(r.remark)}</div>
      </div>
      <div class="s-foot">${T.footerNote}<br>${T.issuedAt}：${esc(r.issued)}　${T.signLine}</div>
    </div>`;
  }

  /* ---------- 列印消費者 Printer consumer（序列化列印，避免衝突） ---------- */
  function startPrinter(H){
    H = H || {};
    const jobs=[]; const seen={}; let printing=false;
    const log = m => H.onLog && H.onLog(m);
    const cnt = n => H.onCount && H.onCount(n);
    function area(){ let pa=document.getElementById('apptPrintArea'); if(!pa){ pa=document.createElement('div'); pa.id='apptPrintArea'; document.body.appendChild(pa); } return pa; }
    function enqueue(k,j){
      if (seen[k]) return; seen[k]=1;
      jobs.push(Object.assign({key:k},j)); cnt(jobs.length);
      log('Job received 收到指令: '+((j.rec&&j.rec.no)||'?')); pump();
    }
    async function pump(){
      if (printing) return; printing=true;   // 同一時間只印一張 One job at a time
      while (jobs.length){
        const j = jobs.shift(); cnt(jobs.length);
        await DB.remove('printQueue/'+j.key).catch(()=>{});
        area().innerHTML = slipHTML(j.rec||{});
        const copies = Math.max(1, j.copies||1);
        setTimeout(()=>{ for(let i=0;i<copies;i++) window.print(); log('✅ '+((j.rec&&j.rec.no)||'SLIP')+' x'+copies+' sent 已發送'); },250);
        await new Promise(r=>setTimeout(r,900));
      }
      printing=false;
    }
    DB.on('printQueue', v => { const all=v||{}; Object.keys(all).forEach(k=>{ const j=all[k]; if(j&&!j.done&&!seen[k]) enqueue(k,j); }); });
    log('Consumer started 消費者已啟動');
    return { testPrint(rec){ area().innerHTML = slipHTML(rec); setTimeout(()=>window.print(),250); } };
  }

  /* ---------- 初始化 Init ---------- */
  function init(){
    try{ firebase.initializeApp(CFG.firebase); }catch(e){}
    DB._init();
  }

  return { init, createRecord, onRecords, reprint, queuePrint, slipHTML, startPrinter, esc, todayStr, nowLabel, DB, CFG };
})();
