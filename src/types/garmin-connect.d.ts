declare module "garmin-connect" {
  export class GarminConnect {
    constructor(options: { username: string; password: string });
    login(): Promise<void>;
    getDailySummary(date: string): Promise<Record<string, unknown> | null>;
  }
}
