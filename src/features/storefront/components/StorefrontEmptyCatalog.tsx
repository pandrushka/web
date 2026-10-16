import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'

export function StorefrontEmptyCatalog() {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'secondary.light', color: 'secondary.main', display: 'grid', placeItems: 'center' }}><Inventory2OutlinedIcon aria-hidden="true" /></Box>
          <Typography variant="h6" component="h2">Product catalog</Typography>
          <Typography color="text.secondary">Products will appear here when the catalog is available.</Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
