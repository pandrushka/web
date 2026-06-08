import { apiRequest, authorizationHeaders } from './client'
import type { AnswerValue, NewQuestionPayload, Question, QuestionResponse, QuestionsResponse } from '../types/onboarding'

export function fetchQuestions(token: string) {
  return apiRequest<QuestionsResponse>('/api/v1/onboarding/questions', {
    headers: authorizationHeaders(token),
  })
}

export function submitAnswers(token: string, questions: Question[], answers: Record<number, AnswerValue>) {
  return apiRequest('/api/v1/onboarding/answers', {
    method: 'POST',
    headers: authorizationHeaders(token),
    body: JSON.stringify({
      answers: questions.map((question) => ({
        question_id: question.id,
        value: answers[question.id],
      })),
    }),
  })
}

export function fetchAdminQuestions(token: string) {
  return apiRequest<QuestionsResponse>('/api/v1/admin/onboarding/questions', {
    headers: authorizationHeaders(token),
  })
}

export function updateAdminQuestion(token: string, questionId: number, payload: Partial<NewQuestionPayload>) {
  return apiRequest<QuestionResponse>(`/api/v1/admin/onboarding/questions/${questionId}`, {
    method: 'PATCH',
    headers: authorizationHeaders(token),
    body: JSON.stringify({ question: payload }),
  })
}

export function createAdminQuestion(token: string, payload: NewQuestionPayload) {
  return apiRequest<QuestionResponse>('/api/v1/admin/onboarding/questions', {
    method: 'POST',
    headers: authorizationHeaders(token),
    body: JSON.stringify({ question: payload }),
  })
}
