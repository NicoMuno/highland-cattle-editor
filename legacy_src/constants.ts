
import { AppConfig, SiteContent } from './types';

export const DEFAULT_CONFIG: AppConfig = {
  workspacePath: '',
  githubToken: '',
  sourceRepoUrl: '',
  hostedRepoUrl: '',
  sourceLocalPath: '',
  hostedLocalPath: '',
  isConfigured: false
};

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    title: 'Fresh From Our Fields',
    subtitle: 'Quality organic produce delivered from our family to yours.',
    imageUrl: '/images/hero-default.jpg',
    buttonText: 'Shop Now'
  },
  produce: []
};

export const JSON_PATHS = {
  HERO: 'src/data/hero.json',
  PRODUCE: 'src/data/produce.json'
};

export const IMAGE_DIR = 'public/images';
export const LEGACY_DIR = 'public/images/legacy';
