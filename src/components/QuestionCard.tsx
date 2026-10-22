import { Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { QuestionControl } from './QuestionControl'
import type { AnswerValue, Question } from '../types/onboarding'
import { useAppTranslation } from '../i18n/useAppTranslation'

type QuestionCardProps = {
  question: Question
  value: AnswerValue
  onChange: (value: AnswerValue) => void
}

export function QuestionCard({ question, value, onChange }: QuestionCardProps) {
  const { t } = useAppTranslation('legacy')
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography color="secondary" sx={{ fontWeight: 700, fontSize: 13 }}>
              {t('questionNumber', { number: question.position })}
            </Typography>
            <Chip size="small" label={t(`questionTypes.${question.question_type}`)} />
          </Stack>
          <Typography variant="h6">
            {question.prompt}
          </Typography>
          <QuestionControl question={question} value={value} onChange={onChange} />
        </Stack>
      </CardContent>
    </Card>
  )
}
