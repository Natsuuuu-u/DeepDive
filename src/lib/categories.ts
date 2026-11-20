/**
 * Player-facing categories. Each group maps onto one or more question-bank
 * categories so that narrow display categories (e.g. "Biology & Animals")
 * still have a meaningful pool at every difficulty.
 */
export const ALL_CATEGORIES_ID = 'all'

export interface CategoryGroup {
  id: string
  label: string
  /** Question-bank categories that belong to this group. */
  categories: readonly string[]
}

export const CATEGORY_GROUPS: readonly CategoryGroup[] = [
  { id: 'general-knowledge', label: 'General Knowledge', categories: ['General Knowledge', 'Everyday Objects'] },
  { id: 'science', label: 'Science', categories: ['Science', 'Inventions and Discoveries'] },
  { id: 'biology-animals', label: 'Biology & Animals', categories: ['Biology', 'Animals'] },
  { id: 'geography', label: 'Geography', categories: ['Geography'] },
  { id: 'history', label: 'History', categories: ['History'] },
  { id: 'astronomy-space', label: 'Astronomy & Space', categories: ['Space and Astronomy'] },
  { id: 'technology', label: 'Technology', categories: ['Technology'] },
  { id: 'computer-science', label: 'Computer Science', categories: ['Computer Science'] },
  { id: 'mathematics', label: 'Mathematics', categories: ['Mathematics'] },
  { id: 'literature', label: 'Literature & Books', categories: ['Literature and Books'] },
  { id: 'movies-tv', label: 'Movies & Television', categories: ['Movies', 'Television'] },
  { id: 'anime', label: 'Anime & Manga', categories: ['Anime and Manga'] },
  { id: 'video-games', label: 'Video Games', categories: ['Video Games'] },
  { id: 'music', label: 'Music', categories: ['Music'] },
  { id: 'sports', label: 'Sports', categories: ['Sports'] },
  { id: 'food', label: 'Food & Cuisine', categories: ['Food and Drinks'] },
  { id: 'nature', label: 'Nature & Environment', categories: ['Nature'] },
  { id: 'human-body', label: 'Human Body', categories: ['Human Body'] },
  { id: 'mythology', label: 'Mythology', categories: ['Mythology'] },
  { id: 'language', label: 'Language & Vocabulary', categories: ['Language and Vocabulary'] },
  { id: 'famous-people', label: 'Famous People', categories: ['Famous People'] },
  { id: 'world-records', label: 'World Records', categories: ['World Records'] },
  { id: 'countries-cultures', label: 'Countries & Cultures', categories: ['Countries and Cultures'] },
  { id: 'ocean-marine', label: 'Ocean & Marine Life', categories: ['Ocean and Marine Life'] },
  { id: 'art-architecture', label: 'Art & Architecture', categories: ['Art and Architecture'] },
]

export const ALL_CATEGORIES: CategoryGroup = {
  id: ALL_CATEGORIES_ID,
  label: 'All Categories',
  categories: [],
}

export function isCategoryId(value: unknown): value is string {
  return value === ALL_CATEGORIES_ID || CATEGORY_GROUPS.some((group) => group.id === value)
}

/** Maps legacy or corrupted values to All Categories so old saves keep working. */
export function normalizeCategoryId(value: unknown): string {
  return isCategoryId(value) ? value : ALL_CATEGORIES_ID
}

export function getCategoryGroup(id: string | undefined): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((group) => group.id === id)
}

export function getCategoryLabel(id: string | undefined): string {
  if (!id || id === ALL_CATEGORIES_ID) return ALL_CATEGORIES.label
  return getCategoryGroup(id)?.label ?? ALL_CATEGORIES.label
}

/** Question bank categories a selection covers; null means every category. */
export function getCategoryBankNames(id: string | undefined): readonly string[] | null {
  if (!id || id === ALL_CATEGORIES_ID) return null
  return getCategoryGroup(id)?.categories ?? null
}
