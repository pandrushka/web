import { Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { QuestionControl } from './QuestionControl'
import type { AnswerValue, Question } from '../types/onboarding'
import { formatQuestionType } from '../utils/onboarding'

type QuestionCardProps = {
  question: Question
  value: AnswerValue
  onChange: (value: AnswerValue) => void
}

export function QuestionCard({ question, value, onChange }: QuestionCardProps) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography color="secondary" sx={{ fontWeight: 900, fontSize: 13 }}>
              Question {question.position}
            </Typography>
            <Chip size="small" label={formatQuestionType(question.question_type)} />
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {question.prompt}
          </Typography>
          <QuestionControl question={question} value={value} onChange={onChange} />
        </Stack>
      </CardContent>
    </Card>
  )
}
