/**
 * NutriFuture — Game Page (Học mà chơi)
 * 4 khối: Điểm & chuỗi ngày · Câu đố hôm nay · Thử thách tuần · Huy hiệu.
 * Toàn bộ logic nằm ở NF_Game (js/game-engine.js); trang này chỉ hiển thị.
 * Mọi văn bản câu hỏi/đáp án (kể cả do AI sinh) đều được escape trước khi chèn vào HTML.
 */
const NF_PageGame = (() => {
  'use strict';

  const esc = (s) => NF_UI.escapeHtml(s);
  const LETTERS = ['A', 'B', 'C', 'D'];

  let root = null;
  let seenBadges = null;          // để chỉ "pop" huy hiệu mới đạt được
  let awardHandler = null;
  let quizError = '';
  let quizLoading = false;
  let feedback = null;            // { choice, correctIndex, explain, correct, gained } của câu vừa trả lời
  let practice = null;            // { questions, index, score, feedback } — luyện tập, không tính điểm

  /* ─── Khối 1: Điểm & chuỗi ngày ─── */

  function renderStats() {
    const el = root.querySelector('#game-stats');
    if (!el) return;
    const s = NF_Game.getSummary();
    const cap = NF_Game.CAPS;
    el.innerHTML = `
      <div class="card__label">ĐIỂM & CHUỖI NGÀY</div>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:var(--sp-2); margin-bottom:var(--sp-3);">
        <div>
          <span class="stat-card__value">${NF_UI.formatNumber(s.points)}</span>
          <span class="stat-card__unit">điểm</span>
        </div>
        <span class="tag ${s.streak > 0 ? 'tag--amber' : 'tag--primary'}">
          <i class="fa-solid fa-fire"></i> ${s.streak} ngày liên tục
        </span>
      </div>
      <div class="text-xs text-muted" style="line-height:1.7;">
        ${s.todayLogged
          ? '<i class="fa-solid fa-circle-check" style="color:var(--green-600);"></i> Hôm nay bạn đã ghi nhật ký.'
          : '<i class="fa-regular fa-circle" style="color:var(--ink-faint);"></i> Hôm nay chưa ghi nhật ký — ghi 1 món để giữ chuỗi ngày.'}
        <br>Tra cứu: ${s.daily.lookups}/${cap.lookup} lần • Ghi nhật ký: ${s.daily.diary}/${cap.diary} lần •
        Ngày ăn lành mạnh: ${s.daily.healthyAwarded ? 'đã tính ✓' : 'chưa'}
      </div>
    `;
  }

  /* ─── Khối 3: Thử thách tuần ─── */

  function renderWeekly() {
    const el = root.querySelector('#game-weekly');
    if (!el) return;
    const w = NF_Game.getSummary().weekly;
    const pct = Math.round((w.progress / w.challenge.target) * 100);
    el.innerHTML = `
      <div class="card__label">THỬ THÁCH TUẦN NÀY</div>
      <div style="font-weight:800; font-size:var(--fs-md); margin-bottom:var(--sp-2);">${esc(w.challenge.title)}</div>
      <div class="progress-bar" style="margin-bottom:var(--sp-2);">
        <div class="progress-bar__fill" style="width:${pct}%;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--sp-2); flex-wrap:wrap;">
        <span class="text-sm text-bold">${w.progress}/${w.challenge.target} ${esc(w.challenge.unit)}</span>
        ${w.done
          ? '<span class="tag tag--primary"><i class="fa-solid fa-check"></i> Hoàn thành • +30 điểm</span>'
          : '<span class="text-xs text-muted">Hoàn thành để nhận +30 điểm</span>'}
      </div>
    `;
  }

  /* ─── Khối 4: Huy hiệu ─── */

  function renderBadges() {
    const el = root.querySelector('#game-badges');
    if (!el) return;
    const s = NF_Game.getSummary();
    if (seenBadges === null) seenBadges = new Set(s.badges);
    const tiles = Object.values(NF_Game.BADGES).map((b) => {
      const earned = s.badges.includes(b.id);
      const isNew = earned && !seenBadges.has(b.id);
      return `
        <div class="badge-tile ${earned ? 'badge-tile--earned' : ''} ${isNew ? 'badge-tile--new' : ''}">
          <div class="badge-tile__icon"><i class="fa-solid ${earned ? b.icon : 'fa-lock'}"></i></div>
          <div class="badge-tile__name">${esc(b.name)}</div>
          <div class="badge-tile__desc">${esc(b.desc)}</div>
        </div>`;
    }).join('');
    seenBadges = new Set(s.badges);
    el.innerHTML = `
      <div class="card__label">HUY HIỆU (${s.badges.length}/${Object.keys(NF_Game.BADGES).length})</div>
      <div class="badge-grid">${tiles}</div>
    `;
  }

  /* ─── Khối 2: Câu đố hôm nay ─── */

  function optionsHtml(q, fb) {
    return q.options.map((opt, i) => {
      let cls = 'quiz-option';
      if (fb) {
        if (i === fb.correctIndex) cls += ' quiz-option--correct';
        else if (i === fb.choice) cls += ' quiz-option--wrong';
        else cls += ' quiz-option--dim';
      }
      return `<button type="button" class="${cls}" data-choice="${i}" ${fb ? 'disabled' : ''}>
        <span class="quiz-option__key">${LETTERS[i]}</span><span>${esc(opt)}</span>
      </button>`;
    }).join('');
  }

  function feedbackHtml(fb, isLast) {
    return `
      <div class="advice-box ${fb.correct ? 'advice-box--success' : 'advice-box--warning'}" style="margin-top:var(--sp-3);">
        <i class="fa-solid ${fb.correct ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
        <strong>${fb.correct ? `Chính xác!${fb.gained ? ` +${fb.gained} điểm` : ''}` : 'Chưa đúng.'}</strong>
        ${fb.explain ? esc(fb.explain) : ''}
      </div>
      <button type="button" class="btn btn--primary" id="btn-quiz-next" style="width:100%; margin-top:var(--sp-3);">
        ${isLast ? 'Xem kết quả' : 'Câu tiếp theo'} <i class="fa-solid fa-arrow-right"></i>
      </button>`;
  }

  function renderQuiz() {
    const el = root.querySelector('#game-quiz');
    if (!el) return;

    if (practice) return renderPractice(el);

    if (quizLoading) {
      el.innerHTML = `
        <div class="card__label">CÂU ĐỐ HÔM NAY</div>
        <div class="loading-text" style="margin-bottom:var(--sp-2);">Đang chuẩn bị 5 câu đố cho hôm nay...</div>
        ${NF_UI.createSkeleton(5)}`;
      return;
    }
    if (quizError) {
      el.innerHTML = `
        <div class="card__label">CÂU ĐỐ HÔM NAY</div>
        <div class="advice-box advice-box--warning"><p>${esc(quizError)}</p></div>
        <button type="button" class="btn btn--outline btn--sm" id="btn-quiz-retry" style="margin-top:var(--sp-3);">
          <i class="fa-solid fa-rotate-right"></i> Thử lại
        </button>`;
      el.querySelector('#btn-quiz-retry').onclick = loadQuiz;
      return;
    }

    const quiz = NF_Game.getQuiz();
    if (!quiz.ready) return;

    // Đã xong lượt tính điểm hôm nay
    if (quiz.done && !feedback) {
      const points = quiz.score * NF_Game.POINTS.quiz;
      el.innerHTML = `
        <div class="card__label">CÂU ĐỐ HÔM NAY</div>
        <div style="text-align:center; padding:var(--sp-3) 0;">
          <div class="stat-card__value">${quiz.score}/${NF_Game.QUIZ_SIZE}</div>
          <p class="text-sm text-muted" style="margin:var(--sp-2) 0;">
            Bạn được <strong>+${points} điểm</strong> từ lượt tính điểm hôm nay.
            ${quiz.score === NF_Game.QUIZ_SIZE ? '<br>Tuyệt vời! Bạn đạt huy hiệu <strong>Nhà thông thái</strong> 🎓' : 'Ngày mai sẽ có 5 câu mới!'}
          </p>
        </div>
        <button type="button" class="btn btn--outline" id="btn-quiz-practice" style="width:100%;">
          <i class="fa-solid fa-dumbbell"></i> Chơi thêm (luyện tập, không tính điểm)
        </button>`;
      el.querySelector('#btn-quiz-practice').onclick = startPractice;
      return;
    }

    const index = feedback ? quiz.answers.length - 1 : quiz.answers.length;
    const q = quiz.questions[index];
    const pct = Math.round(((feedback ? index + 1 : index) / NF_Game.QUIZ_SIZE) * 100);
    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--sp-2); margin-bottom:var(--sp-2);">
        <div class="card__label" style="margin-bottom:0;">CÂU ĐỐ HÔM NAY</div>
        <span class="tag tag--primary">Câu ${index + 1}/${NF_Game.QUIZ_SIZE}${q.origin === 'ai' ? ' • AI tạo' : ''}</span>
      </div>
      <div class="progress-bar" style="margin-bottom:var(--sp-3);"><div class="progress-bar__fill" style="width:${pct}%;"></div></div>
      <div class="quiz-question">${esc(q.q)}</div>
      <div class="quiz-options">${optionsHtml(q, feedback)}</div>
      ${feedback ? feedbackHtml(feedback, index === NF_Game.QUIZ_SIZE - 1) : ''}
    `;

    if (feedback) {
      el.querySelector('#btn-quiz-next').onclick = () => { feedback = null; renderQuiz(); renderStats(); renderBadges(); renderWeekly(); };
    } else {
      el.querySelectorAll('.quiz-option').forEach((btn) => {
        btn.onclick = () => {
          const choice = Number(btn.dataset.choice);
          try {
            const r = NF_Game.answerQuestion(index, choice);
            feedback = { choice, correctIndex: r.correctIndex, explain: r.explain, correct: r.correct, gained: r.gained };
          } catch (e) {
            console.warn('[Game] answer:', e);
            feedback = null;
          }
          renderQuiz();
          renderStats();
        };
      });
    }
  }

  /* Luyện tập ("Chơi thêm"): chỉ trong bộ nhớ, không cộng điểm */

  function startPractice() {
    const questions = NF_Game.practiceSet();
    if (questions.length < NF_Game.QUIZ_SIZE) { NF_UI.showToast('Chưa đủ câu hỏi để luyện tập thêm', 'info'); return; }
    practice = { questions, index: 0, score: 0, feedback: null };
    renderQuiz();
  }

  function renderPractice(el) {
    const p = practice;
    if (p.index >= p.questions.length) {
      el.innerHTML = `
        <div class="card__label">LUYỆN TẬP</div>
        <div style="text-align:center; padding:var(--sp-3) 0;">
          <div class="stat-card__value">${p.score}/${p.questions.length}</div>
          <p class="text-sm text-muted" style="margin:var(--sp-2) 0;">Lượt luyện tập không cộng điểm — cứ chơi cho vui và học thêm nhé!</p>
        </div>
        <div style="display:flex; gap:var(--sp-2); flex-wrap:wrap;">
          <button type="button" class="btn btn--primary" id="btn-practice-again" style="flex:1 1 10rem;">Chơi tiếp</button>
          <button type="button" class="btn btn--outline" id="btn-practice-exit" style="flex:1 1 10rem;">Xong</button>
        </div>`;
      el.querySelector('#btn-practice-again').onclick = startPractice;
      el.querySelector('#btn-practice-exit').onclick = () => { practice = null; renderQuiz(); };
      return;
    }
    const q = p.questions[p.index];
    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--sp-2); margin-bottom:var(--sp-2);">
        <div class="card__label" style="margin-bottom:0;">LUYỆN TẬP • KHÔNG TÍNH ĐIỂM</div>
        <span class="tag tag--primary">Câu ${p.index + 1}/${p.questions.length}</span>
      </div>
      <div class="quiz-question">${esc(q.q)}</div>
      <div class="quiz-options">${optionsHtml(q, p.feedback)}</div>
      ${p.feedback ? feedbackHtml(p.feedback, p.index === p.questions.length - 1) : ''}
    `;
    if (p.feedback) {
      el.querySelector('#btn-quiz-next').onclick = () => { p.feedback = null; p.index++; renderQuiz(); };
    } else {
      el.querySelectorAll('.quiz-option').forEach((btn) => {
        btn.onclick = () => {
          const choice = Number(btn.dataset.choice);
          const correct = choice === q.answer;
          if (correct) p.score++;
          p.feedback = { choice, correctIndex: q.answer, explain: q.explain, correct, gained: 0 };
          renderQuiz();
        };
      });
    }
  }

  async function loadQuiz() {
    quizError = '';
    if (NF_Game.getQuiz().ready) { renderQuiz(); return; }
    quizLoading = true;
    renderQuiz();
    try {
      await NF_Game.ensureDailyQuiz();
    } catch (e) {
      console.warn('[Game] ensureDailyQuiz:', e);
      quizError = 'Không thể tạo bộ câu đố hôm nay. Vui lòng thử lại.';
    } finally {
      quizLoading = false;
    }
    if (root && root.isConnected) renderQuiz();
  }

  /* ─── Trang ─── */

  function render(container) {
    root = container;
    feedback = null;
    practice = null;
    quizError = '';
    quizLoading = false;

    // Đánh giá lại (huy hiệu "Người mới", chuỗi ngày...) trước khi vẽ
    try { NF_Game.award('sync'); } catch (e) { console.warn('[Game] sync:', e); }

    container.innerHTML = `
      <div class="page page--game">
        <div class="page__header">
          <div class="section-label">Gamification</div>
          <h1 class="page-title">Học mà chơi</h1>
          <p class="text-sm text-muted">Tích điểm khi tra cứu, ghi nhật ký và ăn uống lành mạnh — trả lời 5 câu đố mỗi ngày!</p>
        </div>

        <div class="page__body">
          <div class="card card--glass" id="game-stats"></div>

          <div class="grid-2-desktop">
            <div class="card" id="game-quiz"></div>
            <div style="display:flex; flex-direction:column; gap:var(--sp-4);">
              <div class="card" id="game-weekly"></div>
              <div class="card" id="game-badges"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    renderStats();
    renderWeekly();
    renderBadges();
    loadQuiz();

    // Cập nhật các khối điểm/huy hiệu khi có thưởng mới (không vẽ lại câu đố để khỏi làm gián đoạn)
    if (awardHandler) window.removeEventListener('nf:game-award', awardHandler);
    awardHandler = () => {
      if (!root || !root.isConnected || !root.querySelector('#game-stats')) return;
      renderStats(); renderWeekly(); renderBadges();
    };
    window.addEventListener('nf:game-award', awardHandler);
  }

  return { render };
})();
