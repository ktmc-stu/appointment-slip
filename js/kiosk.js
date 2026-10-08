/* Kiosk 打印站 */
(function () {
  const $ = s => document.querySelector(s);
  const selected = new Set();
  let active = null;   // null → 自动（有今天选今天，否则全部）

  function tick() {
    const d = new Date();
    $('#clockTime').textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(SK.pad).join(':');
    $('#clockDate').textContent = `${SK.todayStr(d)} 星期${'日一二三四五六'[d.getDay()]}`;
  }
  tick(); setInterval(tick, 1000);

  const items = () => Object.entries(DB.state.appointments || {}).map(([id, a]) => ({ id, ...a }));
  const byDateTime = (a, b) =>
    String(a.date || '').localeCompare(String(b.date || '')) ||
    String(a.time || '').localeCompare(String(b.time || '')) ||
    (a.createdAt || 0) - (b.createdAt || 0);
  const visible = list => active === 'all' ? list
    : active === 'today' ? list.filter(i => i.date === SK.todayStr())
    : list.filter(i => i.date === active);

  function render() {
    $('#kSchool').textContent = SK.schoolName();
    const p = $('#syncPill');
    if (DB.mode === 'cloud') { p.className = 'pill pill-on'; p.innerHTML = '<i class="led"></i>云端同步'; }
    else { p.className = 'pill pill-off'; p.innerHTML = '<i class="led"></i>本机模式'; }

    const list = items().sort(byDateTime);
    const dates = [...new Set(list.map(i => i.date).filter(Boolean))].sort();
    if (active === null) active = list.some(i => i.date === SK.todayStr()) ? 'today' : 'all';
    if (active !== 'all' && active !== 'today' && !dates.includes(active))
      active = dates.includes(SK.todayStr()) ? 'today' : (dates[0] || 'all');

    const todayN = list.filter(i => i.date === SK.todayStr()).length;
    const chips = [['today', `今天（${todayN}）`], ['all', `全部（${list.length}）`]]
      .concat(dates.map(d => [d, d + (d === SK.todayStr() ? ' · 今天' : '')]));
    $('#dateChips').innerHTML = chips.map(([v, l]) =>
      `<button class="chip${v === active ? ' on' : ''}" data-v="${SK.esc(v)}">${SK.esc(l)}</button>`).join('');

    const vis = visible(list);
    const visIds = new Set(vis.map(i => i.id));
    for (const id of [...selected]) if (!visIds.has(id)) selected.delete(id);

    $('#cardGrid').innerHTML = vis.map(i => `
      <button class="kcard${selected.has(i.id) ? ' sel' : ''}" data-id="${i.id}">
        <span class="k-time mono">${SK.esc(i.time) || '--:--'}</span>
        <span class="k-who"><b>${SK.esc(i.form) || '—'}<i> / </i>${SK.esc(i.classNo) || '—'}</b></span>
        <span class="k-see">👤 ${SK.esc(i.shouldSee) || '—'}</span>
        <span class="k-meta mono">${SK.esc(i.date) || '—'} · Room ${SK.esc(i.room) || '—'}</span>
        ${i.remark ? `<span class="k-rmk">${SK.esc(i.remark)}</span>` : ''}
        <span class="k-check">✓</span>
      </button>`).join('');

    const emp = $('#kioskEmpty');
    emp.hidden = vis.length > 0;
    emp.textContent = active === 'today' ? '今天没有预约 —— 点上方日期标签查看其他日期' : '这个日期没有预约';
    counts(vis);
  }

  function counts(vis) {
    vis = vis || visible(items().sort(byDateTime));
    $('#selCount').textContent = selected.size;
    const ps = $('#printSelected');
    ps.textContent = `列印已选（${selected.size}）`;
    ps.disabled = selected.size === 0;
    const pa = $('#printAll');
    pa.textContent = `列印全部（${vis.length}）`;
    pa.disabled = vis.length === 0;
  }

  $('#dateChips').addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    active = c.dataset.v; render();
  });

  $('#cardGrid').addEventListener('click', e => {
    const c = e.target.closest('.kcard');
    if (!c) return;
    const id = c.dataset.id;
    selected.has(id) ? selected.delete(id) : selected.add(id);
    c.classList.toggle('sel', selected.has(id));
    counts();
  });

  $('#selectAll').addEventListener('click', () => { visible(items()).forEach(i => selected.add(i.id)); render(); });
  $('#clearSel').addEventListener('click', () => { selected.clear(); render(); });

  $('#printAll').addEventListener('click', () => SK.print(visible(items().sort(byDateTime))));
  $('#printSelected').addEventListener('click', () => SK.print(items().sort(byDateTime).filter(i => selected.has(i.id))));
  $('#testPrint').addEventListener('click', () => SK.print([{
    form: '3', classNo: '5A', shouldSee: 'Mr. Chan',
    date: SK.todayStr(), time: '14:30', room: '204',
    remark: 'Test page · 测试列印'
  }]));

  DB.init().then(() => DB.onChange(render));
})();
