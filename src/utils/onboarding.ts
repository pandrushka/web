import type { AnswerValue, Question, QuestionType } from '../types/onboarding'

export function defaultAnswers(questions: Question[]) {
  return questions.reduce<Record<number, AnswerValue>>((memo, question) => {
    if (question.question_type === 'multi_select') {
      memo[question.id] = []
    } else {
      memo[question.id] = ''
    }

    return memo
  }, {})
}

export function hasAnswer(question: Question, value: AnswerValue | undefined) {
  if (question.question_type === 'boolean') return value === true || value === false
  if (question.question_type === 'multi_select') return Array.isArray(value) && value.length > 0
  if (question.question_type === 'number') return typeof value === 'number' && Number.isFinite(value)
  return typeof value === 'string' && value.trim().length > 0
}

export function parseOptions(optionsText: string) {
  return optionsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [label, value] = line.split('|').map((part) => part.trim())
      const optionValue = value || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

      return {
        label,
        value: optionValue,
        active: true,
        position: index + 1,
      }
    })
}

export function formatQuestionType(questionType: QuestionType) {
  return questionType.replace('_', ' ')
}
