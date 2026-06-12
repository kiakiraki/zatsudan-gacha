import { pickStyle, pickTopics } from './gacha.ts';
import type { Category, Style, Topic } from './gacha.ts';

type ExcludedIdsFile = {
  excluded_ids: string[];
};

type AppData = {
  styles: Style[];
  topics: Topic[];
  excluded: Set<string>;
  categories: Map<string, Category>;
};

const TOPIC_COUNT = 9;
const MAX_PER_CATEGORY = 2;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url} の取得に失敗しました (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function loadData(): Promise<AppData> {
  const [styles, topics, excluded, categories] = await Promise.all([
    fetchJson<Style[]>('./data/styles.json'),
    fetchJson<Topic[]>('./data/topics.json'),
    fetchJson<ExcludedIdsFile>('./data/excluded_ids.json'),
    fetchJson<Category[]>('./data/categories.json'),
  ]);

  return {
    styles,
    topics,
    excluded: new Set(excluded.excluded_ids),
    categories: new Map(categories.map((c) => [c.id, c])),
  };
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

function renderTopics(topics: Topic[], categories: Map<string, Category>, root: HTMLElement) {
  root.innerHTML = '';
  for (const topic of topics) {
    const card = document.createElement('article');
    card.className = 'topic-card';
    card.dataset.category = topic.category;

    const category = categories.get(topic.category);
    if (category) {
      card.style.setProperty('--cat-bg-light', category.colors.light.bg);
      card.style.setProperty('--cat-text-light', category.colors.light.text);
      card.style.setProperty('--cat-bg-dark', category.colors.dark.bg);
      card.style.setProperty('--cat-text-dark', category.colors.dark.text);
    }

    const tag = document.createElement('span');
    tag.className = 'category-tag';
    tag.textContent = category?.label ?? topic.category;

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
    renderTopics(topics, data.categories, topicsGrid);
    flash(topicsGrid);
  };

  rerollStyle();
  rerollTopics();

  rerollStyleBtn.addEventListener('click', rerollStyle);
  rerollTopicsBtn.addEventListener('click', rerollTopics);
}

main();
