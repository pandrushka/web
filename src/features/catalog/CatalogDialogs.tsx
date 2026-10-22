import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormHelperText, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import type { CatalogCategory, CatalogProduct, ProductChanges, ProductUnit } from '../../api/catalog'
import { PRODUCT_UNITS } from '../../api/catalog'
import { ProductImage } from './ProductImage'
import type { ImageTokenRefresh } from '../../api/productImages'
import { useAppTranslation } from '../../i18n/useAppTranslation'

export type ProductImageChanges = { file: File | null; remove: boolean }

type ProductDialogProps = {
  open: boolean
  product: CatalogProduct | null
  categories: CatalogCategory[]
  saving: boolean
  savingLabel?: string
  error: string | null
  imageError?: string | null
  accessToken?: string
  cacheScope?: string
  refreshAccessToken?: ImageTokenRefresh
  onClose: () => void
  onSave: (changes: ProductChanges, imageChanges: ProductImageChanges) => void
}

const maxImageBytes = 5 * 1024 * 1024
const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp']

export function ProductDialog({ open, product, categories, saving, savingLabel, error, imageError, accessToken = '', cacheScope = 'product-dialog', refreshAccessToken, onClose, onSave }: ProductDialogProps) {
  if (!open) return null
  return <ProductDialogForm {...{ open, product, categories, saving, savingLabel, error, imageError, accessToken, cacheScope, refreshAccessToken, onClose, onSave }} />
}

function ProductDialogForm({ open, product, categories, saving, savingLabel, error, imageError, accessToken = '', cacheScope = 'product-dialog', refreshAccessToken, onClose, onSave }: ProductDialogProps) {
  const { t } = useAppTranslation('catalog')
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product?.price ?? '')
  const [unit, setUnit] = useState<ProductUnit>(product?.unit ?? 'unidad')
  const [categoryId, setCategoryId] = useState(product?.category_id?.toString() ?? '')
  const [available, setAvailable] = useState(product?.available ?? true)
  const [active, setActive] = useState(product?.active ?? true)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageSelectionError, setImageSelectionError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview.url) }
  }, [imagePreview])

  const priceError = error?.split(', ').find((part) => /^price\b/i.test(part))
  const nameError = error?.split(', ').find((part) => /^name\b/i.test(part))
  const unitError = error?.split(', ').find((part) => /^unit\b/i.test(part))
  const categoryError = error?.split(', ').find((part) => /category/i.test(part))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({
      name: name.trim(),
      description: description.trim(),
      price: price.trim(),
      unit,
      category_id: categoryId ? Number(categoryId) : null,
      available,
      active,
    }, { file: selectedImage, remove: removeImage })
  }

  function selectImage(file: File | undefined) {
    if (!file) return
    if (!acceptedImageTypes.includes(file.type)) {
      setSelectedImage(null)
      setRemoveImage(false)
      setImagePreview(null)
      setImageSelectionError(t('invalidImageType'))
      return
    }
    if (file.size > maxImageBytes) {
      setSelectedImage(null)
      setRemoveImage(false)
      setImagePreview(null)
      setImageSelectionError(t('imageTooLarge'))
      return
    }
    setImageSelectionError(null)
    setRemoveImage(false)
    setSelectedImage(file)
    setImagePreview({ file, url: URL.createObjectURL(file) })
  }

  const currentImagePath = product?.image?.present ? product.image.thumbnail_path : null
  const imagePreviewContent = imagePreview ? (
    <BoxImage src={imagePreview.url} alt={t('selectedImageAlt')} />
  ) : selectedImage ? null : removeImage ? null : currentImagePath && accessToken ? (
    <ProductImage path={currentImagePath} accessToken={accessToken} cacheScope={cacheScope} alt={t('productImageAlt', { name: product?.name ?? t('productName') })} refreshAccessToken={refreshAccessToken} size={96} />
  ) : null

  function clearSelectedImage() {
    setSelectedImage(null)
    setImagePreview(null)
    setImageSelectionError(null)
  }

  function requestImageRemoval() {
    if (selectedImage) {
      setSelectedImage(null)
      setImagePreview(null)
    }
    setRemoveImage(Boolean(currentImagePath))
  }

  return (
    <Dialog open={open} onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="sm" aria-labelledby="product-dialog-title">
      <form onSubmit={submit}>
      <DialogTitle id="product-dialog-title">{product ? t('editProduct') : t('addProduct')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error" role="alert">{error}</Alert>}
            <TextField label={t('productName')} value={name} onChange={(event) => setName(event.target.value)} required autoFocus error={Boolean(nameError)} helperText={nameError} slotProps={{ htmlInput: { maxLength: 255 } }} />
            <TextField label={t('description')} value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={2} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label={t('price')} value={price} onChange={(event) => setPrice(event.target.value)} required type="number" inputMode="decimal" slotProps={{ htmlInput: { min: 0, step: '0.01', inputMode: 'decimal' } }} error={Boolean(priceError)} helperText={priceError ?? t('priceHelp')} sx={{ flex: 1 }} />
              <FormControl required error={Boolean(unitError)} sx={{ flex: 1 }}>
                <InputLabel id="product-unit-label">{t('unit')}</InputLabel>
                <Select labelId="product-unit-label" label={t('unit')} value={unit} onChange={(event) => setUnit(event.target.value as ProductUnit)}>
                  {PRODUCT_UNITS.map((option) => <MenuItem key={option} value={option}>{t(`units.${option}`)}</MenuItem>)}
                </Select>
                {unitError && <FormHelperText>{unitError}</FormHelperText>}
              </FormControl>
            </Stack>
            <FormControl>
              <InputLabel id="product-category-label">{t('category')}</InputLabel>
              <Select labelId="product-category-label" label={t('category')} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} error={Boolean(categoryError)}>
                <MenuItem value=""><em>{t('noCategory')}</em></MenuItem>
                {categories.map((category) => <MenuItem key={category.id} value={category.id.toString()}>{category.name}{category.active ? '' : t('archivedMarker')}</MenuItem>)}
              </Select>
              {categoryError && <Alert severity="error" sx={{ mt: 1 }}>{categoryError}</Alert>}
            </FormControl>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormControl>
                <InputLabel id="product-availability-label">{t('availability')}</InputLabel>
                <Select labelId="product-availability-label" label={t('availability')} value={available ? 'available' : 'unavailable'} onChange={(event) => setAvailable(event.target.value === 'available')}>
                  <MenuItem value="available">{t('available')}</MenuItem>
                  <MenuItem value="unavailable">{t('temporarilyUnavailable')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel id="product-active-label">{t('listing')}</InputLabel>
                <Select labelId="product-active-label" label={t('listing')} value={active ? 'active' : 'archived'} onChange={(event) => setActive(event.target.value === 'active')}>
                  <MenuItem value="active">{t('active')}</MenuItem>
                  <MenuItem value="archived">{t('archived')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t('productImageOptional')}</Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  {imagePreviewContent}
                {!imagePreview && <Typography variant="body2" color="text.secondary">{removeImage ? t('imageRemovedOnSave') : t('noImageSelected')}</Typography>}
                <input ref={cameraInput} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label={t('takePhoto')} onChange={(event) => { selectImage(event.target.files?.[0]); event.target.value = '' }} />
                <input ref={libraryInput} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label={t('choosePhoto')} onChange={(event) => { selectImage(event.target.files?.[0]); event.target.value = '' }} />
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Button size="small" startIcon={<PhotoCameraOutlinedIcon />} onClick={() => cameraInput.current?.click()} disabled={saving}>{t('takePhoto')}</Button>
                  <Button size="small" startIcon={<PhotoLibraryOutlinedIcon />} onClick={() => libraryInput.current?.click()} disabled={saving}>{t('choosePhoto')}</Button>
                  {(selectedImage || currentImagePath) && <Button size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={selectedImage ? clearSelectedImage : requestImageRemoval} disabled={saving}>{selectedImage ? t('clearSelection') : t('removeImage')}</Button>}
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary">{t('imageFormats')}</Typography>
              {(imageSelectionError || imageError) && <Alert severity="error" role="alert">{imageSelectionError ?? imageError}</Alert>}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap' }}>
          <Button onClick={onClose} disabled={saving}>{t('cancel')}</Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim() || !price.trim()}>{saving ? savingLabel ?? t('saving') : t('saveProduct')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function BoxImage({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }} />
}

type CategoryDialogProps = {
  open: boolean
  category: CatalogCategory | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (name: string) => void
}

export function CategoryDialog({ open, category, saving, error, onClose, onSave }: CategoryDialogProps) {
  if (!open) return null
  return <CategoryDialogForm {...{ open, category, saving, error, onClose, onSave }} />
}

function CategoryDialogForm({ open, category, saving, error, onClose, onSave }: CategoryDialogProps) {
  const { t } = useAppTranslation('catalog')
  const [name, setName] = useState(category?.name ?? '')
  const nameError = error?.split(', ').find((part) => /^name\b/i.test(part))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(name.trim())
  }

  return (
    <Dialog open={open} onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="xs" aria-labelledby="category-dialog-title">
      <form onSubmit={submit}>
        <DialogTitle id="category-dialog-title">{category ? t('editCategory') : t('addCategory')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error" role="alert">{error}</Alert>}
            <TextField label={t('categoryName')} value={name} onChange={(event) => setName(event.target.value)} required autoFocus error={Boolean(nameError)} helperText={nameError ?? t('categoryUnique')} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>{t('cancel')}</Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim()}>{saving ? t('saving') : t('saveCategory')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
