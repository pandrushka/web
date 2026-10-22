import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import commonEs from './locales/es/common.json'
import commonEn from './locales/en/common.json'
import authEs from './locales/es/auth.json'
import authEn from './locales/en/auth.json'
import dashboardEs from './locales/es/dashboard.json'
import dashboardEn from './locales/en/dashboard.json'
import storesEs from './locales/es/stores.json'
import storesEn from './locales/en/stores.json'
import catalogEs from './locales/es/catalog.json'
import catalogEn from './locales/en/catalog.json'
import invitationsEs from './locales/es/invitations.json'
import invitationsEn from './locales/en/invitations.json'
import storefrontEs from './locales/es/storefront.json'
import storefrontEn from './locales/en/storefront.json'
import onboardingEs from './locales/es/onboarding.json'
import onboardingEn from './locales/en/onboarding.json'
import legacyEs from './locales/es/legacy.json'
import legacyEn from './locales/en/legacy.json'
import { getInitialLanguage, persistLanguage } from './languageStorage'

export const namespaces = ['common', 'auth', 'dashboard', 'stores', 'catalog', 'invitations', 'storefront', 'onboarding', 'legacy'] as const
export type Namespace = typeof namespaces[number]

const resources = {
  es: { common: commonEs, auth: authEs, dashboard: dashboardEs, stores: storesEs, catalog: catalogEs, invitations: invitationsEs, storefront: storefrontEs, onboarding: onboardingEs, legacy: legacyEs },
  en: { common: commonEn, auth: authEn, dashboard: dashboardEn, stores: storesEn, catalog: catalogEn, invitations: invitationsEn, storefront: storefrontEn, onboarding: onboardingEn, legacy: legacyEn },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'es',
  supportedLngs: ['es', 'en'],
  defaultNS: 'common',
  ns: namespaces,
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
})

i18n.on('languageChanged', (language) => {
  const supportedLanguage = language.startsWith('en') ? 'en' : 'es'
  persistLanguage(supportedLanguage)
  if (typeof document !== 'undefined') document.documentElement.lang = supportedLanguage
})

if (typeof document !== 'undefined') document.documentElement.lang = getInitialLanguage()

export default i18n
