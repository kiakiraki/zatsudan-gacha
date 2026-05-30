type Style = {
  id: string;
  name: string;
  description: string;
};

type Topic = {
  id: string;
  category: string;
  text: string;
};

type ExcludedIdsFile = {
  excluded_ids: string[];
};

type AppData = {
  styles: Style[];
  topics: Topic[];
  excluded: Set<string>;
};

const TOPIC_COUNT = 9;
const MAX_PER_CATEGORY = 2;

const CATEGORY_LABEL: Record<string, string> = {
  tools: '道具',
  food: '食',
  hobby: '趣味',
  childhood: '子供のころ',
  travel: '旅',
  bgm: 'BGM',
  season: '季節',
  lifestyle: '暮らし',
  imagination: 'もしも',
  gadget: 'ガジェット',
  learning: '学び',
};

async function loadData(): Promise<AppData> {
  const [styles, topics, excluded] = await Promise.all([
    fetch('./data/styles.json').then((r) => r.json() as Promise<Style[]>),
    fetch('./data/topics.json').then((r) => r.json() as Promise<Topic[]>),
    fetch('./data/excluded_ids.json').then((r) => r.json() as Promise<ExcludedIdsFile>),
  ]);

  return {
    styles,
    topics,
    excluded: new Set(excluded.excluded_ids),
  };
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function pickStyle(styles: Style[], current?: Style): Style {
  if (styles.length === 0) {
    throw new Error('styles.json が空です');
  }
  if (styles.length === 1 || !current) {
    return styles[Math.floor(Math.random() * styles.length)]!;
  }
  const others = styles.filter((s) => s.id !== current.id);
  return others[Math.floor(Math.random() * others.length)]!;
}

function pickTopics(
  topics: Topic[],
  excluded: Set<string>,
  count: number,
  maxPerCategory: number,
): Topic[] {
  const pool = topics.filter((t) => !excluded.has(t.id));
  if (pool.length < count) {
    return shuffle(pool);
  }

  const shuffled = shuffle(pool);
  const picked: Topic[] = [];
  const perCategory: Record<string, number> = {};

  for (const topic of shuffled) {
    if (picked.length >= count) break;
    const used = perCategory[topic.category] ?? 0;
    if (used >= maxPerCategory) continue;
    picked.push(topic);
    perCategory[topic.category] = used + 1;
  }

  if (picked.length < count) {
    const pickedIds = new Set(picked.map((t) => t.id));
    for (const topic of shuffled) {
      if (picked.length >= count) break;
      if (pickedIds.has(topic.id)) continue;
      picked.push(topic);
    }
  }

  return picked;
}

function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category;
}

function renderStyle(style: Style, root: HTMLElement) {
  root.innerHTML = '';
  const name = document.createElement('h3');
  name.className = 'style-name';
  name.textContent = style.name;

  const desc = document.createElement('p');
  desc.className = 'style-description';
  desc.textContent = style.description;

  root.append(name, desc);
}

function renderTopics(topics: Topic[], root: HTMLElement) {
  root.innerHTML = '';
  for (const topic of topics) {
    const card = document.createElement('article');
    card.className = 'topic-card';
    card.dataset.category = topic.category;

    const tag = document.createElement('span');
    tag.className = 'category-tag';
    tag.textContent = categoryLabel(topic.category);

    const text = document.createElement('p');
    text.className = 'topic-text';
    text.textContent = topic.text;

    card.append(tag, text);
    root.append(card);
  }
}

function flash(el: HTMLElement) {
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

function showError(message: string) {
  const main = document.querySelector('main');
  if (!main) return;
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.textContent = message;
  main.prepend(banner);
}

async function main() {
  const styleCard = document.getElementById('style-card');
  const topicsGrid = document.getElementById('topics-grid');
  const rerollStyleBtn = document.getElementById('reroll-style');
  const rerollTopicsBtn = document.getElementById('reroll-topics');

  if (!styleCard || !topicsGrid || !rerollStyleBtn || !rerollTopicsBtn) {
    showError('画面の初期化に失敗しました');
    return;
  }

  let data: AppData;
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    showError('データの読み込みに失敗しました');
    return;
  }

  let currentStyle: Style | undefined;

  const rerollStyle = () => {
    currentStyle = pickStyle(data.styles, currentStyle);
    renderStyle(currentStyle, styleCard);
    flash(styleCard);
  };

  const rerollTopics = () => {
    const topics = pickTopics(data.topics, data.excluded, TOPIC_COUNT, MAX_PER_CATEGORY);
    renderTopics(topics, topicsGrid);
    flash(topicsGrid);
  };

  rerollStyle();
  rerollTopics();

  rerollStyleBtn.addEventListener('click', rerollStyle);
  rerollTopicsBtn.addEventListener('click', rerollTopics);
}

main();
