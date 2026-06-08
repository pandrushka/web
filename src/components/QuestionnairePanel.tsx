import { Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { QuestionCard } from './QuestionCard'
import type { AnswerValue, Question } from '../types/onboarding'

type QuestionnairePanelProps = {
  questions: Question[]
  answers: Record<number, AnswerValue>
  questionsLoading: boolean
  submitLoading: boolean
  canSubmitAnswers: boolean
  onAnswerChange: (questionId: number, value: AnswerValue) => void
  onSubmitAnswers: () => void
}

export function QuestionnairePanel({
  questions,
  answers,
  questionsLoading,
  submitLoading,
  canSubmitAnswers,
  onAnswerChange,
  onSubmitAnswers,
}: QuestionnairePanelProps) {
  return (
    <Card elevation={0} sx={{ width: '100%', maxWidth: 860, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography color="secondary" sx={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em' }}>
              CREATE ACCOUNT QUESTIONNAIRE
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 38 }, lineHeight: 1.05 }}>
              Answer the questions we are currently asking.
            </Typography>
          </Stack>

          {questionsLoading ? (
            <Stack sx={{ alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Stack spacing={2}>
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  onChange={(value) => onAnswerChange(question.id, value)}
                />
              ))}
              <Button variant="contained" size="large" disabled={!canSubmitAnswers || submitLoading} onClick={onSubmitAnswers}>
                {submitLoading ? <CircularProgress size={22} color="inherit" /> : 'Save answers'}
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
