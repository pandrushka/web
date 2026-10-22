import { Checkbox, FormControl, FormControlLabel, Radio, RadioGroup, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material'
import type { AnswerValue, Question } from '../types/onboarding'
import { useAppTranslation } from '../i18n/useAppTranslation'

type QuestionControlProps = {
  question: Question
  value: AnswerValue
  onChange: (value: AnswerValue) => void
}

export function QuestionControl({ question, value, onChange }: QuestionControlProps) {
  const { t } = useAppTranslation('legacy')
  if (question.question_type === 'number') {
    return (
      <TextField
        label={t('answer')}
        type="number"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
        fullWidth
      />
    )
  }

  if (question.question_type === 'boolean') {
    return (
      <ToggleButtonGroup
        exclusive
        value={String(value)}
        onChange={(_, nextValue: string | null) => {
          if (nextValue) onChange(nextValue === 'true')
        }}
        aria-label={t('booleanAnswer')}
      >
        <ToggleButton value="true">{t('yes')}</ToggleButton>
        <ToggleButton value="false">{t('no')}</ToggleButton>
      </ToggleButtonGroup>
    )
  }

  if (question.question_type === 'single_select') {
    return (
      <FormControl>
        <RadioGroup value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
          {question.options.map((option) => (
            <FormControlLabel key={option.value} value={option.value} control={<Radio />} label={option.label} />
          ))}
        </RadioGroup>
      </FormControl>
    )
  }

  if (question.question_type === 'multi_select') {
    const selectedValues = Array.isArray(value) ? value : []

    return (
      <Stack>
        {question.options.map((option) => (
          <FormControlLabel
            key={option.value}
            control={
              <Checkbox
                checked={selectedValues.includes(option.value)}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange([...selectedValues, option.value])
                  } else {
                    onChange(selectedValues.filter((selectedValue) => selectedValue !== option.value))
                  }
                }}
              />
            }
            label={option.label}
          />
        ))}
      </Stack>
    )
  }

  return (
    <TextField
      label={t('answer')}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      multiline
      minRows={4}
      fullWidth
    />
  )
}
