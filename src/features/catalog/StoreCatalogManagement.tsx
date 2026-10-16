import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Select, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { archiveCategory, archiveProduct, createCategory, createProduct, fetchCategories, fetchProducts, updateCategory, updateProduct } from '../../api/catalog'
import type { CatalogCategory, CatalogProduct, ProductChanges } from '../../api/catalog'
import { removeProductImage, uploadProductImage } from '../../api/productImages'
import type { ProductImageChanges } from './CatalogDialogs'
import type { ImageTokenRefresh } from '../../api/productImages'
import type { StoreProfile } from '../../api/stores'
import { CategoryDialog, ProductDialog } from './CatalogDialogs'
import { ProductImage } from './ProductImage'

type StoreCatalogManagementProps = {
  accessToken: string
  stores: StoreProfile[]
  scope: 'member' | 'platform'
  platformStoreId?: number | null
  platformStore?: StoreProfile | null
  initialStoreId?: number | null
  onBack?: () => void
  userId?: number
  refreshAccessToken?: ImageTokenRefresh
}

type CatalogSource = 'member' | 'platform'
type ArchiveTarget = { kind: 'product' | 'category'; id: number; name: string }

const managerRoles = ['owner', 'admin']

function money(price: string) {
  return `C$ ${price}`
}

function productStatus(product: CatalogProduct) {
  if (!product.active) return <Chip size="small" label="Archived" color="default" />
  if (!product.available) return <Chip size="small" label="Temporarily unavailable" color="warning" />
  return <Chip size="small" label="Available" color="success" />
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

export function StoreCatalogManagement({ accessToken, stores, scope, platformStoreId = null, platformStore = null, initialStoreId = null, onBack, userId = 0, refreshAccessToken }: StoreCatalogManagementProps) {
  const manageableStores = useMemo(() => stores.filter((store) => managerRoles.includes(store.membership?.role ?? '')), [stores])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(initialStoreId ?? null)
  const store = scope === 'platform'
    ? platformStore?.id === platformStoreId ? platformStore : stores.find((item) => item.id === platformStoreId) ?? null
    : manageableStores.find((item) => item.id === selectedStoreId) ?? manageableStores.find((item) => item.id === initialStoreId) ?? manageableStores[0] ?? null
  const storeId = scope === 'platform' ? platformStoreId : store?.id ?? null
  const membershipRole = stores.find((item) => item.id === storeId)?.membership?.role
  const canManage = scope === 'member' || managerRoles.includes(membershipRole ?? '')
  const source: CatalogSource = canManage ? 'member' : 'platform'

  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(Boolean(storeId))
  const [loadedKey, setLoadedKey] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [tab, setTab] = useState<'products' | 'categories'>('products')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [listingFilter, setListingFilter] = useState('all')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null)
  const [productSaving, setProductSaving] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)
  const [productImageError, setProductImageError] = useState<string | null>(null)
  const [productSavingLabel, setProductSavingLabel] = useState<string | undefined>()
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | null>(null)
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null)
  const [archiveSaving, setArchiveSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const mutationLock = useRef(false)

  useEffect(() => {
    if (initialStoreId !== null) setSelectedStoreId(initialStoreId)
  }, [initialStoreId])

  const loadCatalog = useCallback(() => {
    if (storeId === null) return undefined
    let cancelled = false
    const requestKey = `${source}:${storeId}`
    setLoading(true)
    setLoadError(null)
    setLoadedKey('')
    setCategories([])
    setProducts([])
    Promise.all([fetchCategories(accessToken, storeId, source), fetchProducts(accessToken, storeId, source)])
      .then(([categoryResponse, productResponse]) => {
        if (cancelled) return
        setCategories(categoryResponse.categories)
        setProducts(productResponse.products)
        setLoadedKey(requestKey)
      })
      .catch((error: unknown) => { if (!cancelled) setLoadError(errorMessage(error)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accessToken, source, storeId])

  useEffect(() => loadCatalog(), [loadCatalog, loadAttempt])

  const visibleProducts = useMemo(() => products.filter((product) => {
    if (!product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) return false
    if (categoryFilter !== 'all' && product.category_id?.toString() !== categoryFilter) return false
    if (listingFilter === 'active' && !product.active) return false
    if (listingFilter === 'archived' && product.active) return false
    if (availabilityFilter === 'available' && !product.available) return false
    if (availabilityFilter === 'unavailable' && product.available) return false
    return true
  }), [products, search, categoryFilter, listingFilter, availabilityFilter])

  function openProduct(product: CatalogProduct | null) {
    setEditingProduct(product)
    setProductError(null)
    setProductImageError(null)
    setProductSavingLabel(undefined)
    setProductDialogOpen(true)
  }

  async function saveProduct(changes: ProductChanges, imageChanges: ProductImageChanges) {
    if (!storeId || !canManage || productSaving || mutationLock.current) return
    mutationLock.current = true
    setProductSaving(true)
    setProductError(null)
    setProductImageError(null)
    try {
      const response = editingProduct
        ? await updateProduct(accessToken, storeId, editingProduct.id, changes)
        : await createProduct(accessToken, storeId, changes)
      let savedProduct: CatalogProduct = {
        ...response.product,
        image: response.product.image ?? editingProduct?.image ?? { present: false, thumbnail_path: null },
      }
      const replaceProduct = (updated: CatalogProduct) => {
        savedProduct = updated
        setProducts((current) => current.some((item) => item.id === updated.id)
          ? current.map((item) => item.id === updated.id ? updated : item)
          : [...current, updated].sort((a, b) => a.name.localeCompare(b.name)))
        setEditingProduct(updated)
      }
      replaceProduct(savedProduct)

      if (imageChanges.file || imageChanges.remove) {
        setProductSavingLabel(imageChanges.file ? 'Uploading image…' : 'Removing image…')
        try {
          const imageResponse = imageChanges.file
            ? await uploadProductImage(accessToken, storeId, savedProduct.id, imageChanges.file)
            : await removeProductImage(accessToken, storeId, savedProduct.id)
          replaceProduct({ ...savedProduct, image: imageResponse.product.image })
        } catch (imageError) {
          setProductImageError(errorMessage(imageError))
          return
        }
      }

      setProductDialogOpen(false)
      setNotice(editingProduct ? 'Product updated.' : 'Product added.')
    } catch (error) {
      setProductError(errorMessage(error))
    } finally {
      mutationLock.current = false
      setProductSaving(false)
      setProductSavingLabel(undefined)
    }
  }

  function openCategory(category: CatalogCategory | null) {
    setEditingCategory(category)
    setCategoryError(null)
    setCategoryDialogOpen(true)
  }

  async function saveCategory(name: string) {
    if (!storeId || !canManage || categorySaving || mutationLock.current) return
    mutationLock.current = true
    setCategorySaving(true)
    setCategoryError(null)
    try {
      const response = editingCategory
        ? await updateCategory(accessToken, storeId, editingCategory.id, { name })
        : await createCategory(accessToken, storeId, { name })
      setCategories((current) => editingCategory
        ? current.map((category) => category.id === response.category.id ? response.category : category)
        : [...current, response.category].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)))
      setCategoryDialogOpen(false)
      setNotice(editingCategory ? 'Category updated.' : 'Category added.')
    } catch (error) {
      setCategoryError(errorMessage(error))
    } finally {
      mutationLock.current = false
      setCategorySaving(false)
    }
  }

  async function setProductAvailability(product: CatalogProduct) {
    if (!storeId || !canManage || mutationLock.current) return
    mutationLock.current = true
    setActionError(null)
    try {
      const response = await updateProduct(accessToken, storeId, product.id, { available: !product.available })
      setProducts((current) => current.map((item) => item.id === product.id ? response.product : item))
      setNotice(response.product.available ? 'Product marked available.' : 'Product marked temporarily unavailable.')
    } catch (error) { setActionError(errorMessage(error)) }
    finally { mutationLock.current = false }
  }

  async function reactivateProduct(product: CatalogProduct) {
    if (!storeId || !canManage || mutationLock.current) return
    mutationLock.current = true
    setActionError(null)
    try {
      const response = await updateProduct(accessToken, storeId, product.id, { active: true })
      setProducts((current) => current.map((item) => item.id === product.id ? response.product : item))
      setNotice('Product reactivated.')
    } catch (error) { setActionError(errorMessage(error)) }
    finally { mutationLock.current = false }
  }

  async function toggleCategory(category: CatalogCategory) {
    if (!storeId || !canManage || mutationLock.current) return
    mutationLock.current = true
    setActionError(null)
    try {
      const response = await updateCategory(accessToken, storeId, category.id, { active: !category.active })
      setCategories((current) => current.map((item) => item.id === category.id ? response.category : item))
      setNotice(response.category.active ? 'Category reactivated.' : 'Category archived.')
    } catch (error) { setActionError(errorMessage(error)) }
    finally { mutationLock.current = false }
  }

  async function confirmArchive() {
    if (!archiveTarget || !storeId || archiveSaving || mutationLock.current) return
    mutationLock.current = true
    setArchiveSaving(true)
    setActionError(null)
    try {
      if (archiveTarget.kind === 'product') {
        const response = await archiveProduct(accessToken, storeId, archiveTarget.id)
        setProducts((current) => current.map((item) => item.id === archiveTarget.id ? response.product : item))
      } else {
        const response = await archiveCategory(accessToken, storeId, archiveTarget.id)
        setCategories((current) => current.map((item) => item.id === archiveTarget.id ? response.category : item))
      }
      setNotice(`${archiveTarget.kind === 'product' ? 'Product' : 'Category'} archived.`)
      setArchiveTarget(null)
    } catch (error) { setActionError(errorMessage(error)) }
    finally { mutationLock.current = false; setArchiveSaving(false) }
  }

  const chooseStore = scope === 'member' && manageableStores.length > 1 ? (
    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 260 } }}>
      <InputLabel id="catalog-store-label">Store</InputLabel>
      <Select labelId="catalog-store-label" label="Store" value={store?.id ?? ''} onChange={(event) => setSelectedStoreId(Number(event.target.value))}>
        {manageableStores.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
      </Select>
    </FormControl>
  ) : null

  if (scope === 'member' && manageableStores.length === 0) return <Alert severity="info">No store with product management access is available for this account.</Alert>
  if (scope === 'platform' && !storeId) return <Alert severity="info">Select a store from All Stores to view its catalog.</Alert>

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          {scope === 'platform' && onBack && <Button onClick={onBack} sx={{ mb: 1, px: 0 }}>Back to store details</Button>}
          <Typography variant="h4" component="h2">Products & categories</Typography>
          <Typography color="text.secondary">{store?.name ?? 'Selected store'}{store ? ` · ${store.city}` : ''}{!canManage && ' · Read-only platform view'}</Typography>
        </Box>
        {chooseStore}
      </Stack>

      {actionError && <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}
      {loadError ? (
        <Alert severity="error" action={<Button color="inherit" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry</Button>}>Could not load this store's catalog: {loadError}</Alert>
      ) : loading || loadedKey !== `${source}:${storeId}` ? (
        <Stack sx={{ py: 8, alignItems: 'center' }}><CircularProgress aria-label="Loading catalog" /></Stack>
      ) : (
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 1, sm: 2 } }}>
            <Tabs value={tab} onChange={(_, value: 'products' | 'categories') => setTab(value)} aria-label="Catalog sections" variant="scrollable" allowScrollButtonsMobile>
              <Tab value="products" label={`Products (${products.length})`} />
              <Tab value="categories" label={`Categories (${categories.length})`} />
            </Tabs>
          </Box>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {tab === 'products' ? (
              <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
                  <TextField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" slotProps={{ htmlInput: { 'aria-label': 'Search products' }, input: { startAdornment: <SearchOutlinedIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }} sx={{ flex: 1 }} />
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 190 } }}>
                    <InputLabel id="product-category-filter-label">Category</InputLabel>
                    <Select labelId="product-category-filter-label" label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                      <MenuItem value="all">All categories</MenuItem>
                      {categories.map((category) => <MenuItem key={category.id} value={category.id.toString()}>{category.name}{category.active ? '' : ' (archived)'}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 140 } }}>
                    <InputLabel id="listing-filter-label">Listing</InputLabel>
                    <Select labelId="listing-filter-label" label="Listing" value={listingFilter} onChange={(event) => setListingFilter(event.target.value)}>
                      <MenuItem value="all">All listings</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="archived">Archived</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 170 } }}>
                    <InputLabel id="availability-filter-label">Availability</InputLabel>
                    <Select labelId="availability-filter-label" label="Availability" value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
                      <MenuItem value="all">Any availability</MenuItem><MenuItem value="available">Available</MenuItem><MenuItem value="unavailable">Temporarily unavailable</MenuItem>
                    </Select>
                  </FormControl>
                  {canManage && <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => openProduct(null)} sx={{ flexShrink: 0 }}>Add product</Button>}
                </Stack>
                {visibleProducts.length === 0 ? (
                  <Box sx={{ py: 5, textAlign: 'center' }}><Typography variant="h6">{products.length === 0 ? 'No products yet' : 'No matching products'}</Typography><Typography color="text.secondary">{products.length === 0 ? (canManage ? 'Add everyday items to start building this store catalog.' : 'Products added to this store will appear here.') : 'Try changing your search or filters.'}</Typography></Box>
                ) : (
                  <Grid container spacing={1.5}>
                    {visibleProducts.map((product) => (
                      <Grid key={product.id} size={{ xs: 12, md: 6 }}>
                        <Card variant="outlined" sx={{ height: '100%', boxShadow: 'none' }}>
                          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                            <Stack spacing={1.5}>
                              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                                <ProductImage path={product.image?.present ? product.image.thumbnail_path : null} accessToken={accessToken} cacheScope={`user-${userId}`} alt={`${product.name} image`} refreshAccessToken={refreshAccessToken} size={56} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{product.name}</Typography>
                                  <Typography variant="body2" color="text.secondary">{product.category?.name ?? 'Uncategorized'} · {product.unit}</Typography>
                                </Box>
                                <Typography variant="h6" sx={{ whiteSpace: 'nowrap', color: 'primary.dark' }}>{money(product.price)}</Typography>
                              </Stack>
                              {product.description && <Typography variant="body2" color="text.secondary">{product.description}</Typography>}
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                                {productStatus(product)}
                                {canManage && <Box sx={{ flex: 1 }} />}
                                {canManage && product.active && <Button size="small" onClick={() => void setProductAvailability(product)}>{product.available ? 'Mark unavailable' : 'Mark available'}</Button>}
                                {canManage && !product.active && <Button size="small" aria-label={`Reactivate ${product.name}`} startIcon={<ReplayOutlinedIcon />} onClick={() => void reactivateProduct(product)}>Reactivate</Button>}
                                {canManage && <Button size="small" aria-label={`Edit ${product.name}`} startIcon={<EditOutlinedIcon />} onClick={() => openProduct(product)}>Edit</Button>}
                                {canManage && product.active && <Button size="small" color="error" aria-label={`Archive ${product.name}`} startIcon={<ArchiveOutlinedIcon />} onClick={() => setArchiveTarget({ kind: 'product', id: product.id, name: product.name })}>Archive</Button>}
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box><Typography variant="h6">Store categories</Typography><Typography variant="body2" color="text.secondary">Archiving a category does not change products assigned to it.</Typography></Box>
                  {canManage && <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => openCategory(null)}>Add category</Button>}
                </Stack>
                {categories.length === 0 ? <Box sx={{ py: 5, textAlign: 'center' }}><Typography variant="h6">No categories yet</Typography><Typography color="text.secondary">Create categories to organize products.</Typography></Box> : (
                  <Stack spacing={1}>
                    {categories.map((category) => (
                      <Card key={category.id} variant="outlined" sx={{ boxShadow: 'none' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                            <Typography sx={{ flex: 1, fontWeight: 600 }}>{category.name}</Typography>
                            <Chip size="small" label={category.active ? 'Active' : 'Archived'} color={category.active ? 'success' : 'default'} />
                            {canManage && <Button size="small" aria-label={`Edit ${category.name}`} startIcon={<EditOutlinedIcon />} onClick={() => openCategory(category)}>Rename</Button>}
                            {canManage && category.active && <Button size="small" color="error" aria-label={`Archive ${category.name}`} onClick={() => setArchiveTarget({ kind: 'category', id: category.id, name: category.name })}>Archive</Button>}
                            {canManage && !category.active && <Button size="small" aria-label={`Reactivate ${category.name}`} onClick={() => void toggleCategory(category)}>Reactivate</Button>}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      <ProductDialog open={productDialogOpen} product={editingProduct} categories={categories} saving={productSaving} savingLabel={productSavingLabel} error={productError} imageError={productImageError} accessToken={accessToken} cacheScope={`user-${userId}`} refreshAccessToken={refreshAccessToken} onClose={() => setProductDialogOpen(false)} onSave={(changes, imageChanges) => void saveProduct(changes, imageChanges)} />
      <CategoryDialog open={categoryDialogOpen} category={editingCategory} saving={categorySaving} error={categoryError} onClose={() => setCategoryDialogOpen(false)} onSave={(name) => void saveCategory(name)} />
      <Dialog open={Boolean(archiveTarget)} onClose={() => { if (!archiveSaving) setArchiveTarget(null) }} aria-labelledby="archive-dialog-title">
        <DialogTitle id="archive-dialog-title">Archive {archiveTarget?.kind}?</DialogTitle>
        <DialogContent><Typography>{archiveTarget?.name} will remain in management lists and can be reactivated later.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setArchiveTarget(null)} disabled={archiveSaving}>Cancel</Button><Button color="error" variant="contained" onClick={() => void confirmArchive()} disabled={archiveSaving}>{archiveSaving ? 'Archiving…' : 'Archive'}</Button></DialogActions>
      </Dialog>
    </Stack>
  )
}
