const STORAGE_KEY = 'stw-tutorial-dismissed';

const TUTORIAL_STEPS = [
  {
    id: 'map',
    target: '#map',
    message: 'Tap a beach on the map to see its conditions and details.',
    arrow: 'bottom',
  },
  {
    id: 'beach-name',
    target: '.info-header',
    message: 'Selected beach and quick summary. Add it to favourites with the heart.',
    arrow: 'bottom',
  },
  {
    id: 'beach-details',
    target: '#beach-tags-toggle',
    message: 'Tap here to hide/show the details about the beach. A live video will load here if available.',
    arrow: 'bottom',
  },
  {
    id: 'conditions',
    target: '.beach-conditions-card',
    message: 'Tide, waves, sea temp and wind at a glance.',
    arrow: 'bottom',
  },
  {
    id: 'chevrons',
    target: '.beach-conditions-card .tile-toggle',
    message: 'Tap the chevrons to collapse or expand a section.',
    arrow: 'bottom',
  },
  {
    id: 'tide',
    target: '.info-item.tide',
    message: 'Tide times and heights for your chosen beach.',
    arrow: 'bottom',
  },
  {
    id: 'waves',
    target: '#wave-box',
    message: 'Wave height and power from local buoys.',
    arrow: 'bottom',
  },
  {
    id: 'flippable',
    target: '.wave-details-button',
    message: 'Cards with a pulsing icon can be tapped for more info.',
    arrow: 'bottom',
  },
  {
    id: 'weather',
    target: '#weather-box',
    message: 'Weather, rain chance and UV for your chosen beach.',
    arrow: 'bottom',
  },
  {
    id: 'favourites',
    target: '#favourites-bar',
    message: 'Shortcuts to your favourite beaches.',
    arrow: 'top',
  },
  {
    id: 'theme',
    target: '#theme-toggle',
    message: 'Switch between light and dark mode.',
    arrow: 'top',
  },
  {
    id: 'bulb',
    target: '#tutorial-restore',
    message: 'Tap the bulb to see the tutorial again anytime.',
    arrow: 'top',
  },
];

function getDismissedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setDismissedIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (_e) {}
}

function positionTip(tipEl, targetEl) {
  if (!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  const arrow = tipEl.dataset.arrow || 'bottom';

  tipEl.style.position = 'fixed';
  tipEl.style.left = '';
  tipEl.style.right = '';
  tipEl.style.top = '';
  tipEl.style.bottom = '';

  const gap = 8;
  const tipRect = tipEl.getBoundingClientRect();
  const pad = 12;

  let x = 0;
  let y = 0;

  if (arrow === 'bottom') {
    x = rect.left + rect.width / 2 - tipRect.width / 2;
    y = rect.bottom + gap;
    tipEl.style.top = `${y}px`;
  } else {
    // top
    x = rect.left + rect.width / 2 - tipRect.width / 2;
    y = rect.top - tipRect.height - gap;
    tipEl.style.top = `${y}px`;
    tipEl.style.bottom = 'auto';
  }

  x = Math.max(pad, Math.min(window.innerWidth - tipRect.width - pad, x));
  tipEl.style.left = `${x}px`;

  // Align arrow with target: position arrow along tip edge so it points at the target
  const targetCenterX = rect.left + rect.width / 2;
  const arrowCenter = targetCenterX - x;
  const arrowClamped = Math.max(7, Math.min(tipRect.width - 7, arrowCenter));
  tipEl.style.setProperty('--arrow-offset', `${arrowClamped}px`);
}

function getFirstUndismissedStep() {
  const dismissedIds = getDismissedIds();
  return TUTORIAL_STEPS.find((step) => !dismissedIds.includes(step.id)) ?? null;
}

function createTipEl(step) {
  const targetEl = document.querySelector(step.target);
  if (!targetEl) return null;

  const wrap = document.createElement('div');
  wrap.className = `tutorial-tip tutorial-tip--${step.arrow}`;
  wrap.dataset.tutorialId = step.id;
  wrap.dataset.arrow = step.arrow;
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-label', 'Tip');

  wrap.innerHTML = `
    <span class="tutorial-tip-arrow" aria-hidden="true"></span>
    <p class="tutorial-tip-message">${step.message}</p>
    <button type="button" class="tutorial-tip-dismiss" aria-label="Dismiss tip">Got it</button>
  `;

  const dismissBtn = wrap.querySelector('.tutorial-tip-dismiss');
  dismissBtn.addEventListener('click', () => dismiss(step.id));

  return { wrap, targetEl };
}

function repositionVisibleTip() {
  const container = document.getElementById('tutorial-overlays');
  if (!container) return;
  const tip = container.querySelector('.tutorial-tip');
  if (!tip) return;
  const step = TUTORIAL_STEPS.find((s) => s.id === tip.dataset.tutorialId);
  const target = step && document.querySelector(step.target);
  if (target) positionTip(tip, target);
}

function dismiss(id) {
  const ids = getDismissedIds();
  if (ids.includes(id)) return;
  setDismissedIds([...ids, id]);
  showCurrentTip();
  updateRestoreButton();
}

function updateRestoreButton() {
  const dismissed = getDismissedIds();
  const restoreBtn = document.getElementById('tutorial-restore');
  if (!restoreBtn) return;
  const allDismissed = TUTORIAL_STEPS.every((s) => dismissed.includes(s.id));
  const currentStep = getFirstUndismissedStep();
  const showBulb = allDismissed || (currentStep && currentStep.id === 'bulb');
  restoreBtn.style.display = showBulb ? '' : 'none';
  restoreBtn.setAttribute('aria-hidden', showBulb ? 'false' : 'true');
}

function showCurrentTip() {
  const container = document.getElementById('tutorial-overlays');
  if (!container) return;

  container.innerHTML = '';
  const step = getFirstUndismissedStep();
  if (!step) {
    updateRestoreButton();
    return;
  }

  const created = createTipEl(step);
  if (!created) {
    updateRestoreButton();
    return;
  }
  const { wrap, targetEl } = created;
  container.appendChild(wrap);
  requestAnimationFrame(() => positionTip(wrap, targetEl));
  updateRestoreButton();
}

function renderTips() {
  showCurrentTip();
}

function restoreTutorials() {
  setDismissedIds([]);
  renderTips();
  const restoreBtn = document.getElementById('tutorial-restore');
  if (restoreBtn) restoreBtn.style.display = 'none';
}

export function initTutorials() {
  const container = document.getElementById('tutorial-overlays');
  if (!container) return;

  renderTips();

  window.addEventListener('scroll', repositionVisibleTip, { passive: true });
  window.addEventListener('resize', repositionVisibleTip);

  const restoreBtn = document.getElementById('tutorial-restore');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', () => {
      restoreTutorials();
    });
  }
}
