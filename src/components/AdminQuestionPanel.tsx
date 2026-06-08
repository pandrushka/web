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
import { formatQuestionType, parseOptions } from '../utils/onboarding'

type AdminQuestionPanelProps = {
  questions: Question[]
  loading: boolean
  onToggleQuestion: (question: Question, active: boolean) => void
  onCreateQuestion: (payload: NewQuestionPayload) => void
}

export function AdminQuestionPanel({ questions, loading, onToggleQuestion, onCreateQuestion }: AdminQuestionPanelProps) {
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
            <Typography color="secondary" sx={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em' }}>
              ADMIN QUESTION MANAGEMENT
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 38 }, lineHeight: 1.05 }}>
              Edit what users see during account creation.
            </Typography>
          </Stack>

          {loading && <CircularProgress size={24} />}

          <Stack spacing={1}>
            {questions.map((question) => (
              <Card key={question.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5 }}
                  >
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip size="small" label={`#${question.position}`} />
                        <Chip size="small" label={formatQuestionType(question.question_type)} />
                      </Stack>
                      <Typography sx={{ fontWeight: 800 }}>{question.prompt}</Typography>
                    </Stack>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(question.active)}
                          onChange={(event) => onToggleQuestion(question, event.target.checked)}
                        />
                      }
                      label={question.active ? 'Active' : 'Inactive'}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Divider />

          <Box component="form" onSubmit={handleCreate} sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Add a new question
            </Typography>
            <TextField
              label="Question prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              required
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Question type"
                value={questionType}
                onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                fullWidth
              >
                {questionTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {formatQuestionType(type)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Position"
                type="number"
                value={position}
                onChange={(event) => setPosition(Number(event.target.value))}
                fullWidth
              />
            </Stack>
            <FormControlLabel
              control={<Switch checked={active} onChange={(event) => setActive(event.target.checked)} />}
              label={active ? 'Active' : 'Inactive'}
            />
            {isSelectQuestion && (
              <TextField
                label="Options"
                value={optionsText}
                onChange={(event) => setOptionsText(event.target.value)}
                placeholder={'Long term|long_term\nCasual|casual'}
                helperText="One option per line. Use Label|value, or just Label."
                multiline
                minRows={4}
                required
                fullWidth
              />
            )}
            <Button type="submit" variant="contained" disabled={!canCreate || loading}>
              Add question
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
