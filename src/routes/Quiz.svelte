<script lang="ts">
  import { t, i18n } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { buildQuiz } from '../lib/quiz';

  const questions = $derived(db.status === 'ready' ? buildQuiz(db.bases) : []);
  let idx = $state(0);
  let picked = $state<number | null>(null);
  let score = $state(0);
  let copied = $state(false);

  const q = $derived(questions[idx]);
  const done = $derived(questions.length > 0 && idx >= questions.length);
  const base = $derived(q?.base ? db.byId.get(q.base) : undefined);
  const img = $derived(base?.images?.find((i) => i.type === 'photo') ?? base?.images?.find((i) => i.type === 'satellite'));
  const lang = $derived(i18n.lang);

  function pick(i: number) {
    if (picked !== null) return;
    picked = i;
    if (i === q.answer) score++;
  }
  function next() {
    picked = null;
    idx++;
    document.getElementById('quiz')?.scrollIntoView({ block: 'start' });
  }
  function restart() {
    idx = 0; picked = null; score = 0;
  }
  async function share() {
    const text = t('quiz.shareText', { n: score, total: questions.length });
    const url = location.href.split('#')[0] + '#/quiz';
    if (navigator.share) { try { await navigator.share({ text, url }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(`${text} ${url}`); copied = true; setTimeout(() => (copied = false), 2000); } catch { /* ignore */ }
  }
</script>

<div class="quiz container" id="quiz">
  <p class="kicker">{t('quiz.kicker')}</p>
  <h1>{t('quiz.title')}</h1>

  {#if !questions.length}
    <p class="muted">{t('common.loading')}</p>
  {:else if done}
    <section class="result card">
      <p class="big">{score} / {questions.length}</p>
      <p class="verdict">{score >= 7 ? t('quiz.great') : score >= 4 ? t('quiz.good') : t('quiz.start')}</p>
      <div class="row">
        <button class="btn btn-primary" onclick={share}>{copied ? '✓ ' + t('base.copied') : '↗ ' + t('base.share')}</button>
        <button class="btn" onclick={restart}>↻ {t('quiz.again')}</button>
        <a class="btn" href={href('/atlas')}>{t('hero.ctaAtlas')} →</a>
      </div>
    </section>
  {:else}
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax={questions.length} aria-valuenow={idx + 1} aria-label={t('quiz.progress', { n: idx + 1, total: questions.length })}>
      {#each questions as _, i}<span class:done={i < idx} class:now={i === idx}></span>{/each}
    </div>
    <p class="count">{t('quiz.progress', { n: idx + 1, total: questions.length })}</p>

    <section class="card qcard">
      <h2>{q.q[lang]}</h2>
      <ul class="opts">
        {#each q.options as o, i}
          <li>
            <button
              class="opt"
              class:right={picked !== null && i === q.answer}
              class:wrong={picked === i && i !== q.answer}
              disabled={picked !== null}
              onclick={() => pick(i)}
            >
              <span class="letter">{String.fromCharCode(65 + i)}</span>{o[lang]}
              {#if picked !== null && i === q.answer}<span class="mark" aria-label={t('quiz.right')}>✓</span>{/if}
              {#if picked === i && i !== q.answer}<span class="mark" aria-label={t('quiz.wrong')}>✗</span>{/if}
            </button>
          </li>
        {/each}
      </ul>

      {#if picked !== null}
        <div class="explain" aria-live="polite">
          <p class="verdict-line">{picked === q.answer ? '✓ ' + t('quiz.right') : '✗ ' + t('quiz.wrong')}</p>
          {#if img}<img src={img.thumb} alt="" width={img.tw} height={img.th} loading="lazy" />{/if}
          <p>{q.explain[lang]}</p>
          {#if base}<a class="link" href={href(`/base/${base.id}`)}>📍 {base.name} →</a>{/if}
          <button class="btn btn-primary next" onclick={next}>{idx + 1 < questions.length ? t('quiz.next') : t('quiz.finish')} →</button>
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .quiz { padding: calc(var(--header-h) + 48px) 0 64px; max-width: 760px; scroll-margin-top: 80px; }
  h1 { font-size: clamp(1.9rem, 4.5vw, 3rem); font-weight: 800; }
  .muted { color: var(--muted); }
  .progress { display: flex; gap: 4px; margin: 24px 0 6px; }
  .progress span { flex: 1; height: 5px; border-radius: 3px; background: var(--line); }
  .progress .done { background: var(--c-shared); }
  .progress .now { background: var(--text); }
  .count { color: var(--muted); font-size: 0.85rem; }
  .qcard { padding: 24px; margin-top: 10px; }
  h2 { font-size: clamp(1.25rem, 2.6vw, 1.6rem); }
  .opts { list-style: none; padding: 0; margin: 18px 0 0; display: grid; gap: 8px; }
  .opt { width: 100%; display: flex; align-items: center; gap: 12px; text-align: left; min-height: 52px; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg-2); font-size: 1rem; transition: border-color 0.15s, background 0.15s; }
  .opt:not(:disabled):hover { border-color: var(--text-2); }
  .opt:disabled { cursor: default; }
  .letter { width: 28px; height: 28px; flex: none; display: grid; place-items: center; border-radius: 8px; background: var(--surface-2); font-weight: 800; font-size: 0.85rem; }
  .right { border-color: var(--c-other); background: rgb(25 158 112 / 0.15); }
  .wrong { border-color: var(--accent); background: rgb(255 90 60 / 0.12); }
  .mark { margin-left: auto; font-weight: 800; }
  .explain { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line); display: grid; gap: 10px; }
  .explain img { width: 100%; max-height: 260px; object-fit: cover; border-radius: 10px; height: auto; }
  .explain p { color: var(--text-2); margin: 0; }
  .verdict-line { font-weight: 800; color: var(--text) !important; }
  .link { font-weight: 600; }
  .next { justify-self: start; }
  .result { padding: 32px; text-align: center; margin-top: 24px; }
  .big { font-size: clamp(4rem, 12vw, 6rem); font-weight: 800; margin: 0; letter-spacing: -0.04em; }
  .verdict { color: var(--text-2); font-size: 1.15rem; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 16px; }
</style>
