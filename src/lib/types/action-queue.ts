export interface ActionItem {
  id: string;
  priority: number; // 1 = highest
  type: 'weight' | 'supplements' | 'meal' | 'workout' | 'vitals' | 'checkin' | 'sleep' | 'walk' | 'motivation';
  title: string;
  subtitle?: string;
  status: 'pending' | 'completed';
  timeWindow: 'morning' | 'midday' | 'evening' | 'night' | 'anytime';
  component: string; // which inline form to render
  data?: Record<string, unknown>;
}
