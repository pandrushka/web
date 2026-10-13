import { useState } from 'react'
import type { FormEvent } from 'react'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Grid, IconButton, Stack, TextField, Typography } from '@mui/material'
import type { StoreProfile, StoreProfileChanges } from '../api/stores'

export type StoreDetailsChanges = StoreProfileChanges

type Props = {
  store: StoreProfile
  editable: boolean
  onSave: (storeId: number, changes: StoreDetailsChanges) => Promise<StoreProfile>
  onStoreUpdated?: (store: StoreProfile) => void
}

type StoreDetailsValues = {
  name: string
  description: string
  logo_initial: string
  phone_number: string
  city: string
  address: string
  directions: string
}

function storeDetails(store: StoreProfile): StoreDetailsValues {
  return {
    name: store.name,
    description: store.description ?? '',
    logo_initial: store.logo_initial || store.name.slice(0, 1).toUpperCase(),
    phone_number: store.phone_number ?? '',
    city: store.city,
    address: store.address ?? '',
    directions: store.directions ?? '',
  }
}

function ReadOnlyField({ label, value, description = false }: { label: string; value: string; description?: boolean }) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ lineHeight: 1.4, textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: description ? 400 : 500, color: value ? 'text.primary' : 'text.secondary', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
        {value || 'Not provided'}
      </Typography>
    </Stack>
  )
}

function statusColor(status: string): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'error'
  if (status === 'draft') return 'warning'
  return 'default'
}

export function StoreDetailsCard({ store, editable, onSave, onStoreUpdated }: Props) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(() => storeDetails(store))
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  function beginEdit() {
    setValues(storeDetails(store))
    setErrors([])
    setSaveError('')
    setSaved(false)
    setEditing(true)
  }

  function cancelEdit() {
    setValues(storeDetails(store))
    setErrors([])
    setSaveError('')
    setEditing(false)
  }

  async function submit() {
    const nextErrors: string[] = []
    if (!values.name.trim()) nextErrors.push('Store name is required.')
    if (!values.city.trim()) nextErrors.push('City is required.')
    setErrors(nextErrors)
    setSaveError('')
    if (nextErrors.length || saving) return

    setSaving(true)
    try {
      const updatedStore = await onSave(store.id, {
        ...values,
        name: values.name.trim(),
        city: values.city.trim(),
      })
      onStoreUpdated?.(updatedStore)
      setSaved(true)
      setEditing(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save store details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const labelProps = { variant: 'caption' as const, sx: { lineHeight: 1.4, textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: 'text.secondary' } }
  const logoAndName = (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
      {editing ? (
        <TextField
          label="Logo initial"
          value={values.logo_initial}
          onChange={(event) => setValues({ ...values, logo_initial: event.target.value.slice(0, 1) })}
          slotProps={{ htmlInput: { maxLength: 1 } }}
          sx={{ width: 88, flexShrink: 0 }}
        />
      ) : (
        <Avatar variant="rounded" sx={{ width: 56, height: 56, flexShrink: 0, bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700, typography: 'h5' }}>
          {store.logo_initial || store.name.slice(0, 1).toUpperCase()}
        </Avatar>
      )}
      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
        {editing ? (
          <TextField label="Store name" required fullWidth value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
        ) : (
          <>
            <Typography {...labelProps}>Store name</Typography>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{store.name}</Typography>
          </>
        )}
        <Chip label={store.status} color={statusColor(store.status)} size="small" sx={{ alignSelf: 'flex-start', height: 24, textTransform: 'capitalize' }} />
      </Stack>
    </Stack>
  )

  const detailField = (key: keyof StoreDetailsValues, label: string, options?: { multiline?: boolean; description?: boolean; type?: string }) => editing ? (
    <TextField
      label={label}
      fullWidth
      multiline={options?.multiline}
      minRows={options?.multiline ? 2 : undefined}
      type={options?.type}
      value={values[key]}
      onChange={(event) => setValues({ ...values, [key]: event.target.value })}
    />
  ) : <ReadOnlyField label={label} value={String(store[key] ?? '')} description={options?.description} />

  return (
    <Card sx={{ width: '100%', maxWidth: 820, mx: 'auto', overflow: 'hidden' }}>
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          bgcolor: editing ? 'secondary.light' : 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          transition: 'background-color 180ms ease, color 180ms ease',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          {editing && <EditOutlinedIcon aria-hidden="true" sx={{ color: 'secondary.main' }} />}
          <Typography variant="subtitle1" component="h3" sx={{ color: editing ? 'secondary.main' : 'text.primary', fontWeight: 600 }}>
            {editing ? 'Editing store details' : 'Store details'}
          </Typography>
          {editing && <Chip label="Edit mode" size="small" color="secondary" sx={{ height: 24 }} />}
        </Stack>
        {editable && !editing && <IconButton aria-label="Edit store details" onClick={beginEdit} sx={{ minWidth: 48, minHeight: 48, color: 'primary.main' }}><EditOutlinedIcon /></IconButton>}
      </Box>

      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Box
          key={editing ? 'editing' : 'viewing'}
          sx={{
            animation: 'storeDetailsIn 180ms ease both',
            '@keyframes storeDetailsIn': { from: { opacity: 0.65, transform: 'translateY(2px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
            {saveError && <Alert severity="error" role="alert" sx={{ mb: 1.5 }}>{saveError}</Alert>}
            {errors.length > 0 && <Alert severity="error" role="alert" sx={{ mb: 1.5 }}>{errors.join(' ')}</Alert>}
            {saved && !editing && <Alert severity="success" role="status" sx={{ mb: 1.5 }}>Store details saved.</Alert>}
            <Stack spacing={1.5} component={editing ? 'form' : 'div'} onSubmit={editing ? (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit() } : undefined}>
              {logoAndName}
              {detailField('description', 'Description', { multiline: true, description: true })}
              <Grid container columnSpacing={2} rowSpacing={1.25}>
                <Grid size={{ xs: 12, sm: 6 }}>{detailField('phone_number', 'Phone / WhatsApp', { type: 'tel' })}</Grid>
                <Grid size={{ xs: 12, sm: 6 }}>{detailField('city', 'City')}</Grid>
                <Grid size={{ xs: 12, sm: 6 }}>{detailField('address', 'Address')}</Grid>
                <Grid size={{ xs: 12, sm: 6 }}>{detailField('directions', 'Directions', { multiline: true })}</Grid>
              </Grid>
              <ReadOnlyField label="Store URL / slug" value={store.slug} />
              {editing && (
                <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end', pt: 0.5 }}>
                  <Button type="button" variant="text" disabled={saving} onClick={cancelEdit} sx={{ minHeight: 48 }}>Cancel</Button>
                  <Button type="submit" variant="contained" disabled={saving} sx={{ minHeight: 48 }}>{saving ? 'Saving…' : 'Save changes'}</Button>
                </Stack>
              )}
            </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}
