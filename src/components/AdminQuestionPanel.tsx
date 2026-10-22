import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type { NewQuestionPayload, Question, QuestionType } from '../types/onboarding'
import { questionTypes } from '../types/onboarding'
import { parseOptions } from '../utils/onboarding'
import { useAppTranslation } from '../i18n/useAppTranslation'

type AdminQuestionPanelProps = {
  questions: Question[]
  loading: boolean
  onToggleQuestion: (question: Question, active: boolean) => void
  onCreateQuestion: (payload: NewQuestionPayload) => void
}

export function AdminQuestionPanel({ questions, loading, onToggleQuestion, onCreateQuestion }: AdminQuestionPanelProps) {
  const { t } = useAppTranslation('legacy')
  const [prompt, setPrompt] = useState('')
  const [questionType, setQuestionType] = useState<QuestionType>('text')
  const [position, setPosition] = useState(questions.length + 1)
  const [active, setActive] = useState(true)
  const [optionsText, setOptionsText] = useState('')

  const isSelectQuestion = questionType === 'single_select' || questionType === 'multi_select'
  const parsedOptions = parseOptions(optionsText)
  const canCreate = prompt.trim().length > 0 && (!isSelectQuestion || parsedOptions.length > 0)

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate) return

    onCreateQuestion({
      prompt: prompt.trim(),
      question_type: questionType,
      active,
      position,
      ...(isSelectQuestion ? { options: parsedOptions } : {}),
    })

    setPrompt('')
    setQuestionType('text')
    setPosition((currentPosition) => currentPosition + 1)
    setActive(true)
    setOptionsText('')
  }

  return (
    <Card elevation={0} sx={{ width: '100%', maxWidth: 860, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography color="secondary" sx={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.08em' }}>
              {t('adminEyebrow')}
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 38 }, lineHeight: 1.05 }}>
              {t('adminTitle')}
            </Typography>
          </Stack>

          {loading && <CircularProgress size={24} />}

          <Stack spacing={1}>
            {questions.map((question) => (
              <Card key={question.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5 }}
                  >
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip size="small" label={`#${question.position}`} />
                        <Chip size="small" label={t(`questionTypes.${question.question_type}`)} />
                      </Stack>
                      <Typography sx={{ fontWeight: 700 }}>{question.prompt}</Typography>
                    </Stack>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(question.active)}
                          onChange={(event) => onToggleQuestion(question, event.target.checked)}
                        />
                      }
                      label={question.active ? t('active') : t('inactive')}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Divider />

          <Box component="form" onSubmit={handleCreate} sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="h6">
              {t('addQuestionTitle')}
            </Typography>
            <TextField
              label={t('prompt')}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              required
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label={t('questionType')}
                value={questionType}
                onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                fullWidth
              >
                {questionTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {t(`questionTypes.${type}`)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('position')}
                type="number"
                value={position}
                onChange={(event) => setPosition(Number(event.target.value))}
                fullWidth
              />
            </Stack>
            <FormControlLabel
              control={<Switch checked={active} onChange={(event) => setActive(event.target.checked)} />}
              label={active ? t('active') : t('inactive')}
            />
            {isSelectQuestion && (
              <TextField
                label={t('options')}
                value={optionsText}
                onChange={(event) => setOptionsText(event.target.value)}
                placeholder={t('optionsExample')}
                helperText={t('optionsHelp')}
                multiline
                minRows={4}
                required
                fullWidth
              />
            )}
            <Button type="submit" variant="contained" disabled={!canCreate || loading}>
              {t('addQuestion')}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
