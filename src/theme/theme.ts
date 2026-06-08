import { createTheme } from '@mui/material/styles'

const cream = '#F4EAD7'
const paper = '#FFF7E8'
const navy = '#1F3142'
const clay = '#B86443'
const clayHover = '#9F5236'
const olive = '#7E8460'
const gold = '#C8AD7A'
const blue = '#425E6F'
const border = '#D8C7A8'

export const brandTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: cream,
      paper,
    },
    primary: {
      main: clay,
      dark: clayHover,
      contrastText: '#fffaf1',
    },
    secondary: {
      main: olive,
      dark: '#68704c',
      contrastText: '#fffaf1',
    },
    text: {
      primary: navy,
      secondary: blue,
    },
    divider: border,
    action: {
      hover: 'rgba(31, 49, 66, 0.04)',
      selected: 'rgba(31, 49, 66, 0.08)',
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontFamily: 'Fraunces, Georgia, serif',
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontFamily: 'Fraunces, Georgia, serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontFamily: 'Fraunces, Georgia, serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: 'Fraunces, Georgia, serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    button: {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 700,
      textTransform: 'none',
      letterSpacing: 0,
    },
    caption: {
      textTransform: 'uppercase',
      letterSpacing: '0.16em',
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          minWidth: '320px',
          backgroundColor: cream,
        },
        body: {
          margin: 0,
          backgroundColor: cream,
          color: navy,
        },
        '#root': {
          minHeight: '100svh',
          backgroundColor: cream,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          minHeight: 48,
          paddingInline: '1.35rem',
          boxShadow: 'none',
          '&.MuiButton-containedPrimary': {
            backgroundColor: clay,
            color: '#fffaf1',
            '&:hover': {
              backgroundColor: clayHover,
              boxShadow: 'none',
            },
          },
          '&.MuiButton-containedSecondary': {
            backgroundColor: olive,
            color: '#fffaf1',
            '&:hover': {
              backgroundColor: '#69704f',
              boxShadow: 'none',
            },
          },
          '&.MuiButton-outlined': {
            borderColor: border,
            backgroundColor: 'rgba(255, 247, 232, 0.35)',
            '&:hover': {
              borderColor: gold,
              backgroundColor: 'rgba(255, 247, 232, 0.75)',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: paper,
          border: `1px solid ${border}`,
          boxShadow: '0 10px 28px rgba(31, 49, 66, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: paper,
          borderColor: border,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          borderColor: border,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundColor: 'rgba(255, 247, 232, 0.7)',
        },
        notchedOutline: {
          borderColor: border,
        },
      },
    },
  },
})
