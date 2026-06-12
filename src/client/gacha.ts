export type Style = {
  id: string;
  name: string;
  description: string;
};

export type Topic = {
  id: string;
  category: string;
  text: string;
};

export type CategoryColors = {
  bg: string;
  text: string;
};

export type Category = {
  id: string;
  label: string;
  colors: {
    light: CategoryColors;
    dark: CategoryColors;
  };
};

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function pickStyle(styles: Style[], current?: Style): Style {
  if (styles.length === 0) {
    throw new Error('styles.json が空です');
  }
  if (styles.length === 1 || !current) {
    return styles[Math.floor(Math.random() * styles.length)]!;
  }
  const others = styles.filter((s) => s.id !== current.id);
  return others[Math.floor(Math.random() * others.length)]!;
}

export function pickTopics(
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
