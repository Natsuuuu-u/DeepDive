import { buildQuestionGroup, type QuestionExpansions, type QuestionRow } from '@/data/questionFactory'

/**
 * Extra questions for existing categories. They use their own id prefixes so
 * the original ids (geo_001, ani_001, …) stay untouched.
 */
const geography: QuestionRow[] = [
  ['Name a strait.', 'medium', 'The Bosphorus connects the Black Sea to the Sea of Marmara.', [
    ['Strait of Gibraltar', 'plankton'],
    ['Bosphorus', 'too-clever', ['Bosporus']],
    ['Bering Strait', 'schooler'],
    ['Strait of Malacca', 'rare'],
    ['Strait of Hormuz', 'deep-cut'],
    ['Strait of Magellan', 'one-in-a-krillion'],
  ]],
]

const animals: QuestionRow[] = [
  ['Name a species of penguin.', 'medium', 'Emperor penguins are the tallest living penguin species.', [
    ['Emperor penguin', 'plankton'],
    ['Adélie penguin', 'too-clever'],
    ['Gentoo penguin', 'schooler'],
    ['Macaroni penguin', 'rare'],
    ['Galápagos penguin', 'deep-cut'],
    ['Little blue penguin', 'one-in-a-krillion', ['Little penguin', 'Fairy penguin']],
  ]],
]

const nature: QuestionRow[] = [
  ['Name a type of soil.', 'medium', 'Loam is a balanced mixture of sand, silt, and clay.', [
    ['Clay', 'plankton'],
    ['Sand', 'too-clever'],
    ['Silt', 'schooler'],
    ['Loam', 'rare'],
    ['Peat', 'deep-cut'],
    ['Chalk', 'one-in-a-krillion'],
  ]],
]

const food: QuestionRow[] = [
  ['Name a type of mushroom used in cooking.', 'medium', 'Portobello and cremini mushrooms are the same species, Agaricus bisporus.', [
    ['Button mushroom', 'plankton', ['White mushroom']],
    ['Portobello', 'too-clever', ['Portabella']],
    ['Shiitake', 'schooler'],
    ['Oyster mushroom', 'rare'],
    ['Chanterelle', 'deep-cut'],
    ['Enoki', 'one-in-a-krillion'],
  ]],
]

const movies: QuestionRow[] = [
  ['Name a film that won the Academy Award for Best Picture.', 'medium', 'Parasite became the first non-English-language film to win Best Picture in 2020.', [
    ['The Godfather', 'plankton'],
    ['Titanic', 'too-clever'],
    ['Casablanca', 'schooler'],
    ['Parasite', 'rare'],
    ['Moonlight', 'deep-cut'],
    ['The Hurt Locker', 'one-in-a-krillion'],
  ]],
]

const music: QuestionRow[] = [
  ['Name a song by the Beatles.', 'medium', 'Yesterday is one of the most covered songs in popular music history.', [
    ['Hey Jude', 'plankton'],
    ['Let It Be', 'too-clever'],
    ['Yesterday', 'schooler'],
    ['Come Together', 'rare'],
    ['Blackbird', 'deep-cut'],
    ['Revolution 9', 'one-in-a-krillion'],
  ]],
]

const sports: QuestionRow[] = [
  ['Name a Grand Slam tennis tournament.', 'medium', 'Wimbledon is the oldest tennis tournament in the world.', [
    ['Wimbledon', 'plankton'],
    ['US Open', 'too-clever'],
    ['French Open', 'schooler', ['Roland Garros']],
    ['Australian Open', 'rare'],
  ]],
]

const history: QuestionRow[] = [
  ['Name a famous explorer.', 'medium', 'Ferdinand Magellan’s expedition completed the first circumnavigation of the globe.', [
    ['Marco Polo', 'plankton'],
    ['Christopher Columbus', 'too-clever'],
    ['Ferdinand Magellan', 'schooler'],
    ['Vasco da Gama', 'rare'],
    ['Zheng He', 'deep-cut'],
    ['Ibn Battuta', 'one-in-a-krillion'],
  ]],
]

const science: QuestionRow[] = [
  ['Name a type of chemical reaction.', 'hard', 'The combustion of methane produces carbon dioxide and water.', [
    ['Combustion', 'plankton'],
    ['Neutralization', 'too-clever'],
    ['Oxidation', 'schooler'],
    ['Precipitation', 'rare'],
    ['Esterification', 'deep-cut'],
    ['Friedel–Crafts reaction', 'one-in-a-krillion'],
  ]],
]

const expandedAppendExpansions: QuestionExpansions = {
  geox_001: {
    answers: [
      ['Strait of Dover', 'schooler'],
      ['Strait of Messina', 'rare'],
      ['Cook Strait', 'rare'],
      ['Palk Strait', 'deep-cut'],
      ['Bab-el-Mandeb', 'deep-cut'],
      ['Great Belt', 'one-in-a-krillion'],
    ],
  },
  anix_001: {
    answers: [
      ['King penguin', 'too-clever'],
      ['Chinstrap penguin', 'schooler'],
      ['African penguin', 'schooler'],
      ['Humboldt penguin', 'rare'],
      ['Rockhopper penguin', 'rare'],
      ['Yellow-eyed penguin', 'deep-cut'],
      ['Fiordland penguin', 'one-in-a-krillion'],
    ],
    aliases: {
      'Adélie penguin': ['Adelie penguin'],
      'Galápagos penguin': ['Galapagos penguin'],
    },
  },
  natx_001: {
    answers: [
      ['Sandy soil', 'too-clever'],
      ['Loess', 'schooler'],
      ['Laterite', 'rare'],
      ['Podzol', 'deep-cut'],
      ['Chernozem', 'one-in-a-krillion'],
    ],
  },
  foodx_001: {
    answers: [
      ['Cremini', 'too-clever'],
      ['Porcini', 'schooler'],
      ['Morel', 'schooler'],
      ['Maitake', 'rare'],
      ['King oyster mushroom', 'rare'],
      ['Lion’s mane mushroom', 'deep-cut'],
      ['Candy cap', 'one-in-a-krillion'],
    ],
  },
  movx_001: {
    answers: [
      ['Gone with the Wind', 'too-clever'],
      ['The Lord of the Rings: The Return of the King', 'schooler'],
      ['Schindler’s List', 'schooler'],
      ['Forrest Gump', 'rare'],
      ['Ben-Hur', 'rare'],
      ['Lawrence of Arabia', 'deep-cut'],
      ['Wings', 'deep-cut'],
      ['Everything Everywhere All at Once', 'one-in-a-krillion'],
    ],
  },
  musx_001: {
    answers: [
      ['Help!', 'too-clever'],
      ['Something', 'schooler'],
      ['Here Comes the Sun', 'schooler'],
      ['Eleanor Rigby', 'rare'],
      ['A Day in the Life', 'rare'],
      ['Strawberry Fields Forever', 'deep-cut'],
      ['Octopus’s Garden', 'deep-cut'],
      ['Norwegian Wood', 'one-in-a-krillion'],
    ],
  },
  sptx_001: {
    aliases: {
      Wimbledon: ['The Championships'],
      'US Open': ['United States Open'],
      'Australian Open': ['Aussie Open'],
    },
  },
  hisx_001: {
    answers: [
      ['James Cook', 'too-clever'],
      ['Samuel de Champlain', 'schooler'],
      ['Henry Hudson', 'schooler'],
      ['Abel Tasman', 'rare'],
      ['Hernán Cortés', 'rare'],
      ['Bartolomeu Dias', 'deep-cut'],
      ['Pytheas', 'one-in-a-krillion'],
    ],
  },
  scix_001: {
    answers: [
      ['Acid–base reaction', 'too-clever'],
      ['Single displacement', 'schooler'],
      ['Double displacement', 'schooler'],
      ['Polymerization', 'rare'],
      ['Substitution reaction', 'rare'],
      ['Elimination reaction', 'deep-cut'],
      ['Cycloaddition', 'one-in-a-krillion'],
    ],
  },
}

export const expandedAppendQuestions = [
  ...buildQuestionGroup('geox', 'Geography', geography, expandedAppendExpansions),
  ...buildQuestionGroup('anix', 'Animals', animals, expandedAppendExpansions),
  ...buildQuestionGroup('natx', 'Nature', nature, expandedAppendExpansions),
  ...buildQuestionGroup('foodx', 'Food and Drinks', food, expandedAppendExpansions),
  ...buildQuestionGroup('movx', 'Movies', movies, expandedAppendExpansions),
  ...buildQuestionGroup('musx', 'Music', music, expandedAppendExpansions),
  ...buildQuestionGroup('sptx', 'Sports', sports, expandedAppendExpansions),
  ...buildQuestionGroup('hisx', 'History', history, expandedAppendExpansions),
  ...buildQuestionGroup('scix', 'Science', science, expandedAppendExpansions),
]
