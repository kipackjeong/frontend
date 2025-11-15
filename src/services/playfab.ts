import { PLAYFAB_CONFIG } from '../constants/config';

// Minimal PlayFab Client API wrapper (Client-side reads; sensitive writes should go via backend)
// Docs: https://docs.microsoft.com/gaming/playfab/api-references/client-api

type PlayFabError = {
  code?: number;
  status?: string;
  error?: string;
  errorMessage?: string;
};

export type LeaderboardEntry = {
  Position: number;
  PlayFabId: string;
  DisplayName?: string;
  StatValue: number;
};

type LoginWithCustomIDResult = {
  data?: {
    SessionTicket: string;
    PlayFabId: string;
    NewlyCreated?: boolean;
  };
  error?: PlayFabError;
};

type GetLeaderboardResult = {
  data?: {
    Leaderboard: Array<LeaderboardEntry>;
  };
  error?: PlayFabError;
};

type GetPlayerStatisticsResult = {
  data?: {
    Statistics: Array<{
      StatisticName: string;
      Value: number;
      Version?: number;
    }>;
  };
  error?: PlayFabError;
};

class PlayFabService {
  private sessionTicket: string | null = null;
  private playFabId: string | null = null;

  isConfigured(): boolean {
    return Boolean(PLAYFAB_CONFIG.TITLE_ID && PLAYFAB_CONFIG.BASE_URL);
  }

  hasSession(): boolean {
    return !!this.sessionTicket;
  }

  getPlayFabId(): string | null {
    return this.playFabId;
  }

  async loginWithCustomId(customId: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isConfigured()) return { success: false, message: 'PlayFab not configured' };

    const body = {
      TitleId: PLAYFAB_CONFIG.TITLE_ID,
      CustomId: customId,
      CreateAccount: true,
      InfoRequestParameters: { GetPlayerProfile: true }
    };

    const res = await fetch(`${PLAYFAB_CONFIG.BASE_URL}/Client/LoginWithCustomID`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const json = (await res.json()) as LoginWithCustomIDResult;

    if (!res.ok || json.error) {
      return { success: false, message: json?.error?.errorMessage || 'Login failed' };
    }

    this.sessionTicket = json.data?.SessionTicket || null;
    this.playFabId = json.data?.PlayFabId || null;
    return { success: true };
  }

  async getLeaderboard(statisticName: string, maxResultsCount: number = 20): Promise<{ success: boolean; items?: LeaderboardEntry[]; message?: string }> {
    if (!this.isConfigured()) return { success: false, message: 'PlayFab not configured' };
    if (!this.sessionTicket) return { success: false, message: 'Not authenticated with PlayFab' };

    const body = { StatisticName: statisticName, MaxResultsCount: maxResultsCount };

    const res = await fetch(`${PLAYFAB_CONFIG.BASE_URL}/Client/GetLeaderboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': this.sessionTicket,
      },
      body: JSON.stringify(body)
    });

    const json = (await res.json()) as GetLeaderboardResult;
    if (!res.ok || json.error) {
      return { success: false, message: json?.error?.errorMessage || 'GetLeaderboard failed' };
    }

    return { success: true, items: json.data?.Leaderboard || [] };
  }

  async getPlayerStatistics(statNames?: string[]): Promise<{ success: boolean; stats?: Record<string, number>; message?: string }> {
    if (!this.isConfigured()) return { success: false, message: 'PlayFab not configured' };
    if (!this.sessionTicket) return { success: false, message: 'Not authenticated with PlayFab' };

    const body = { StatisticNames: statNames };

    const res = await fetch(`${PLAYFAB_CONFIG.BASE_URL}/Client/GetPlayerStatistics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': this.sessionTicket,
      },
      body: JSON.stringify(body)
    });

    const json = (await res.json()) as GetPlayerStatisticsResult;
    if (!res.ok || json.error) {
      return { success: false, message: json?.error?.errorMessage || 'GetPlayerStatistics failed' };
    }

    const stats: Record<string, number> = {};
    (json.data?.Statistics || []).forEach(s => { stats[s.StatisticName] = s.Value; });
    return { success: true, stats };
  }
}

export const playfabService = new PlayFabService();
export default playfabService;
