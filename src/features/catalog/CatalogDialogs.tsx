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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState<ProductUnit>('unidad')
  const [categoryId, setCategoryId] = useState('')
  const [available, setAvailable] = useState(true)
  const [active, setActive] = useState(true)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageSelectionError, setImageSelectionError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setSelectedImage(null)
      setRemoveImage(false)
      setImageSelectionError(null)
      return
    }
    setSelectedImage(null)
    setRemoveImage(false)
    setImageSelectionError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    setName(product?.name ?? '')
    setDescription(product?.description ?? '')
    setPrice(product?.price ?? '')
    setUnit(product?.unit ?? 'unidad')
    setCategoryId(product?.category_id?.toString() ?? '')
    setAvailable(product?.available ?? true)
    setActive(product?.active ?? true)
  }, [open, product?.id])

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(selectedImage)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedImage])

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
      setImageSelectionError('Choose a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > maxImageBytes) {
      setSelectedImage(null)
      setRemoveImage(false)
      setImageSelectionError('Images must be 5 MiB or smaller.')
      return
    }
    setImageSelectionError(null)
    setRemoveImage(false)
    setSelectedImage(file)
  }

  const currentImagePath = product?.image?.present ? product.image.thumbnail_path : null
  const imagePreview = previewUrl ? (
    <BoxImage src={previewUrl} alt="Selected product image preview" />
  ) : selectedImage ? null : removeImage ? null : currentImagePath && accessToken ? (
    <ProductImage path={currentImagePath} accessToken={accessToken} cacheScope={cacheScope} alt={`${product?.name ?? 'Product'} image`} refreshAccessToken={refreshAccessToken} size={96} />
  ) : null

  function clearSelectedImage() {
    setSelectedImage(null)
    setImageSelectionError(null)
  }

  function requestImageRemoval() {
    if (selectedImage) setSelectedImage(null)
    setRemoveImage(Boolean(currentImagePath))
  }

  return (
    <Dialog open={open} onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="sm" aria-labelledby="product-dialog-title">
      <form onSubmit={submit}>
        <DialogTitle id="product-dialog-title">{product ? 'Edit product' : 'Add product'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error" role="alert">{error}</Alert>}
            <TextField label="Product name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus error={Boolean(nameError)} helperText={nameError} slotProps={{ htmlInput: { maxLength: 255 } }} />
            <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={2} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Price (C$)" value={price} onChange={(event) => setPrice(event.target.value)} required type="number" inputMode="decimal" slotProps={{ htmlInput: { min: 0, step: '0.01', inputMode: 'decimal' } }} error={Boolean(priceError)} helperText={priceError ?? 'Enter a Córdoba amount with up to two decimal places.'} sx={{ flex: 1 }} />
              <FormControl required error={Boolean(unitError)} sx={{ flex: 1 }}>
                <InputLabel id="product-unit-label">Unit</InputLabel>
                <Select labelId="product-unit-label" label="Unit" value={unit} onChange={(event) => setUnit(event.target.value as ProductUnit)}>
                  {PRODUCT_UNITS.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </Select>
                {unitError && <FormHelperText>{unitError}</FormHelperText>}
              </FormControl>
            </Stack>
            <FormControl>
              <InputLabel id="product-category-label">Category</InputLabel>
              <Select labelId="product-category-label" label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} error={Boolean(categoryError)}>
                <MenuItem value=""><em>No category</em></MenuItem>
                {categories.map((category) => <MenuItem key={category.id} value={category.id.toString()}>{category.name}{category.active ? '' : ' (archived)'}</MenuItem>)}
              </Select>
              {categoryError && <Alert severity="error" sx={{ mt: 1 }}>{categoryError}</Alert>}
            </FormControl>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormControl>
                <InputLabel id="product-availability-label">Availability</InputLabel>
                <Select labelId="product-availability-label" label="Availability" value={available ? 'available' : 'unavailable'} onChange={(event) => setAvailable(event.target.value === 'available')}>
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="unavailable">Temporarily unavailable</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel id="product-active-label">Listing status</InputLabel>
                <Select labelId="product-active-label" label="Listing status" value={active ? 'active' : 'archived'} onChange={(event) => setActive(event.target.value === 'active')}>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Product image (optional)</Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                {imagePreview}
                {!imagePreview && <Typography variant="body2" color="text.secondary">{removeImage ? 'Image will be removed when you save.' : 'No image selected.'}</Typography>}
                <input ref={cameraInput} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Take product photo" onChange={(event) => { selectImage(event.target.files?.[0]); event.target.value = '' }} />
                <input ref={libraryInput} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose product photo" onChange={(event) => { selectImage(event.target.files?.[0]); event.target.value = '' }} />
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Button size="small" startIcon={<PhotoCameraOutlinedIcon />} onClick={() => cameraInput.current?.click()} disabled={saving}>Take photo</Button>
                  <Button size="small" startIcon={<PhotoLibraryOutlinedIcon />} onClick={() => libraryInput.current?.click()} disabled={saving}>Choose photo</Button>
                  {(selectedImage || currentImagePath) && <Button size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={selectedImage ? clearSelectedImage : requestImageRemoval} disabled={saving}>{selectedImage ? 'Clear selection' : 'Remove image'}</Button>}
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary">JPEG, PNG, or WebP · maximum 5 MiB</Typography>
              {(imageSelectionError || imageError) && <Alert severity="error" role="alert">{imageSelectionError ?? imageError}</Alert>}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap' }}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim() || !price.trim()}>{saving ? savingLabel ?? 'Saving…' : 'Save product'}</Button>
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
  const [name, setName] = useState('')
  useEffect(() => { if (open) setName(category?.name ?? '') }, [category, open])
  const nameError = error?.split(', ').find((part) => /^name\b/i.test(part))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(name.trim())
  }

  return (
    <Dialog open={open} onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="xs" aria-labelledby="category-dialog-title">
      <form onSubmit={submit}>
        <DialogTitle id="category-dialog-title">{category ? 'Edit category' : 'Add category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error" role="alert">{error}</Alert>}
            <TextField label="Category name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus error={Boolean(nameError)} helperText={nameError ?? 'Category names must be unique within this store.'} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save category'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
