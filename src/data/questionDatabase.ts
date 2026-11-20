import { entertainmentAndHistoryQuestions } from '@/data/questionBanks/entertainmentAndHistory'
import { expandedAppendQuestions } from '@/data/questionBanks/expandedAppends'
import { expandedCultureQuestions } from '@/data/questionBanks/expandedCulture'
import { expandedScienceQuestions } from '@/data/questionBanks/expandedScience'
import { knowledgeAndSpaceQuestions } from '@/data/questionBanks/knowledgeAndSpace'
import { worldAndNatureQuestions } from '@/data/questionBanks/worldAndNature'

export const QUESTION_DATABASE = [
  ...worldAndNatureQuestions,
  ...entertainmentAndHistoryQuestions,
  ...knowledgeAndSpaceQuestions,
  ...expandedScienceQuestions,
  ...expandedCultureQuestions,
  ...expandedAppendQuestions,
]
