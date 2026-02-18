import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.proman.app',
  appName: 'Proman',
  webDir: 'out',
  server: {
    url: 'https://proman-liart.vercel.app',
    cleartext: true,
  },
};

export default config;
