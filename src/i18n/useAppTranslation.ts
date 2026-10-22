import { useTranslation } from 'react-i18next'
import type { Namespace } from './index'

export function useAppTranslation(namespace: Namespace | Namespace[] = 'common') {
  return useTranslation(namespace)
}
