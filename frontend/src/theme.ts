import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  colors: {
    brand: {
      50: '#e6f7ff',
      100: '#b3e0ff',
      200: '#80caff',
      300: '#4db3ff',
      400: '#1a9dff',
      500: '#0080ff', // Primary color
      600: '#0066cc',
      700: '#004d99',
      800: '#003366',
      900: '#001933',
    },
    risk: {
      low: '#48BB78', // Green
      medium: '#ECC94B', // Yellow
      high: '#E53E3E', // Red
    }
  },
  fonts: {
    heading: '"Segoe UI", Roboto, system-ui, sans-serif',
    body: '"Segoe UI", Roboto, system-ui, sans-serif',
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'blue',
      },
    },
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      },
    }),
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
});

export default theme;