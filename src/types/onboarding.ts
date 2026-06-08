export type QuestionType = 'text' | 'number' | 'boolean' | 'single_select' | 'multi_select'

export type AnswerValue = string | number | boolean | string[]

export type QuestionOption = {
  id?: number
  label: string
  value: string
  active?: boolean
  position: number
}

export type Question = {
  id: number
  prompt: string
  question_type: QuestionType
  active?: boolean
  position: number
  options: QuestionOption[]
}

export type QuestionsResponse = {
  questions: Question[]
}

export type QuestionResponse = {
  question: Question
}

export type NewQuestionPayload = {
  prompt: string
  question_type: QuestionType
  active: boolean
  position: number
  options?: Array<{
    label: string
    value: string
    active: boolean
    position: number
  }>
}

export const questionTypes: QuestionType[] = ['text', 'number', 'boolean', 'single_select', 'multi_select']
