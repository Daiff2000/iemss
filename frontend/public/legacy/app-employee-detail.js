(() => {
  const token = sessionStorage.getItem('iems_token'), raw = sessionStorage.getItem('iems_user');
  let user = null;
  try { user = JSON.parse(raw || 'null'); } catch (_) {}
  if (!token || !user) { location.href = '/index.html'; return; }
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = '/admin-employees.html'; return; }
  const $ = x => document.getElementById(x), h = { Authorization: 'Bearer ' + token };
  async function api(p) { const x = await fetch(p, { headers: h }), d = await x.json(); if (!x.ok) throw Error(d.error || 'حدث خطأ'); return d; }

  $('chip-name').textContent = user.name || '—';
  $('chip-role').textContent = user.role === 'system_creator' ? 'منشئ النظام' : user.role === 'admin' ? 'مدير النظام' : user.role === 'supervisor' ? 'مشرف' : 'موظف';
  $('chip-avatar').textContent = (user.name || '?')[0];
  $('logout-btn').onclick = () => { sessionStorage.clear(); location.href = '/index.html'; };
  $('back-btn').onclick = () => history.back();

  const esc = v => String(v ?? '—').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const n = v => Math.round(Number(v || 0)).toLocaleString('en-US');
  const p = v => v == null ? '—' : Math.round(Number(v) * 100) + '%';
  const hh = v => { if (v == null || v === '') return '—'; let x = Number(v); if (x > 0 && x < 1) x *= 24; let m = Math.round(x * 60); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); };

  // Colors only (no box/border) for target-vs-achievement percentages — same
  // thresholds used on the home page, just without the pill background.
  function percentClass(value) {
    const x = Number(value);
    if (!Number.isFinite(x)) return '';
    const pct = x * 100;
    return pct < 50 ? 'target-percent-low' : pct < 70 ? 'target-percent-mid' : 'target-percent-high';
  }
  function coloredPercent(value) {
    const text = p(value);
    return text === '—' ? '—' : `<span class="target-percent ${percentClass(value)}">${text}</span>`;
  }

  (async () => {
    try {
      const d = await api('/api/employee/' + encodeURIComponent(id));
      const e = d.employee, s = d.summary || {}, a = d.attendance || {};
      const stageTargets = d.stageTargets || {};

      $('detail-title').textContent = 'بيانات ' + e.name;
      $('detail-info').innerHTML = `<div class="info-item"><span>ID</span><b>${esc(e.id)}</b></div><div class="info-item"><span>الاسم</span><b>${esc(e.name)}</b></div><div class="info-item"><span>الشركة</span><b>${esc(e.company)}</b></div><div class="info-item"><span>الشيفت</span><b>${esc(e.shift)}</b></div><div class="info-item"><span>القسم</span><b>${esc(e.department)}</b></div><div class="info-item"><span>الفئة</span><b>${esc(e.education)}</b></div><div class="info-item"><span>الإقامة</span><b>${esc(e.residence)}</b></div>`;

      const allEntries = Object.entries(d.stages || {});
      const totalTargetEntry = allEntries.find(([name]) => String(name).trim().toUpperCase() === 'TOTAL TARGET %');
      const stageEntries = allEntries.filter(([name]) => String(name).trim().toUpperCase() !== 'TOTAL TARGET %');
      const dates = [...new Set(stageEntries.flatMap(([, rs]) => rs.map(x => x.date)))].sort();

      $('detail-head').innerHTML = '<th>المرحلة</th>' + dates.map(x => '<th>' + esc(String(x).slice(5)) + '</th>').join('') + '<th>الإجمالي</th><th>التارجت الشهري</th><th>نسبة الإنجاز</th><th>النسبة الإجمالية</th>';

      // النسبة الإجمالية تُحسب من الفترة المعروضة (مجموع نسب المراحل، كل مرحلة
      // إنجازها ÷ تارجتها) بدل سحب s.percentage الجاهزة من آخر دورة.
      let overallPercentSum = 0, hasAnyStagePercent = false;
      let grandAchievement = 0, grandTarget = 0;

      const rowsHtml = stageEntries.map(([st, rs]) => {
        const m = Object.fromEntries(rs.map(x => [x.date, x.value]));
        const isAttendance = String(st).trim() === 'الحضور';
        let sum = 0, hasNum = false;
        const cells = dates.map(x => {
          const v = m[x];
          if (v == null || v === '') return '<td>—</td>';
          if (typeof v === 'number') { sum += v; hasNum = true; return '<td>' + n(v) + '</td>'; }
          return '<td>' + esc(v) + '</td>';
        }).join('');
        const target = isAttendance ? null : Number(stageTargets[st]);
        const hasTarget = Number.isFinite(target) && target > 0;
        const stageRatio = hasNum && hasTarget ? sum / target : null;

        if (stageRatio != null) { overallPercentSum += stageRatio; hasAnyStagePercent = true; }
        if (!isAttendance && hasNum) grandAchievement += sum;
        if (hasTarget) grandTarget += target;
        const stagePercent = stageRatio != null ? coloredPercent(stageRatio) : '—';
        return '<tr><td>' + esc(st) + '</td>' + cells + '<td>' + (hasNum ? n(sum) : '—') + '</td><td>' + (target ? n(target) : '—') + '</td><td>' + stagePercent + '</td></tr>';
      });

      const overallPercent = hasAnyStagePercent ? overallPercentSum : null;
      $('detail-overall').innerHTML = '';

      // نسبة التارجت هنا فوق = نفس مجموع نسب المراحل (زي بادج النسبة
      // الإجمالية بالظبط)، مش Master!AP. وإجمالي الإنجاز/التارجت هنا = مجموع
      // كل المراحل الحقيقي، مش summary.total_target الخام (رقم واحد مستورد
      // من صف واحد بالشيت زي 30000 مش له علاقة بمجموع المراحل الفعلي).
      $('detail-perf').innerHTML = `<div class="info-item"><span>نسبة التارجت</span><b>${coloredPercent(overallPercent)}</b></div><div class="info-item"><span>أيام الحضور</span><b>${n(s.total_present_days ?? a.present_days)}</b></div><div class="info-item"><span>إجمالي الغياب</span><b>${n(s.total_absence)}</b></div><div class="info-item"><span>الإضافي</span><b>${hh(s.overtime_hours)}</b></div><div class="info-item"><span>التأخيرات</span><b>${hh(s.late_hours)}</b></div>`;

      if (totalTargetEntry) {
        const m = Object.fromEntries(totalTargetEntry[1].map(x => [x.date, x.value]));
        const cells = dates.map(x => {
          const v = m[x];
          if (v == null || v === '') return '<td>—</td>';
          const num = Number(v);
          return '<td>' + (Number.isFinite(num) ? coloredPercent(num) : esc(v)) + '</td>';
        }).join('');
        rowsHtml.push('<tr class="total-target-row"><td><b> اليومي</b></td>' + cells + '<td>—</td><td>—</td><td>' + coloredPercent(overallPercent) + '</td></tr>');
      }

      if (rowsHtml.length) {
        const merged = `<td class="detail-percentage-merged" rowspan="${rowsHtml.length}"><b>${coloredPercent(overallPercent)}</b><small>النسبة الإجمالية</small></td>`;
        rowsHtml[0] = rowsHtml[0].replace('</tr>', merged + '</tr>');
      }
      $('detail-body').innerHTML = rowsHtml.join('') || '<tr><td colspan="' + (dates.length + 4) + '"><div class="empty-state">لا توجد بيانات مطابقة.</div></td></tr>';
    } catch (err) {
      $('detail-title').textContent = 'خطأ';
      $('detail-info').innerHTML = '<div class="empty-state">' + esc(err.message) + '</div>';
    }
  })();
})();
