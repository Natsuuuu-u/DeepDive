import { motion } from 'framer-motion'
import PixelPanel from '@/components/ui/PixelPanel'
import type { Question } from '@/types'

interface Props {
  question: Question
  index: number
  total: number
}

export default function QuestionCard({ question, index, total }: Props) {
  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PixelPanel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="pixel-text text-gold">{question.category}</span>
            <span className="pixel-text text-slate-400">{question.difficulty}</span>
          </div>
          <span className="pixel-text text-slate-300">{index + 1}/{total}</span>
        </div>
        <p className="text-lg font-semibold leading-snug sm:text-xl">{question.prompt}</p>
      </PixelPanel>
    </motion.div>
  )
}
