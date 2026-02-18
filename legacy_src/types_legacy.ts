
export interface AppConfig {
  workspacePath: string;
  githubToken: string;
  sourceRepoUrl: string;
  hostedRepoUrl: string;
  sourceLocalPath: string;
  hostedLocalPath: string;
  isConfigured: boolean;
}

export interface SiteHero {
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
}

export interface ProduceItem {
  id: string;
  name: string;
  price: string;
  unit: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Season';
  imageUrl: string;
}

export interface SiteContent {
  hero: SiteHero;
  produce: ProduceItem[];
}

export enum ProcessStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string;
  type: 'info' | 'error' | 'success';
  message: string;
}
