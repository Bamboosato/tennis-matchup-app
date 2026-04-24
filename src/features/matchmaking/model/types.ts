export type ParticipantInput = {
  id: string;
  name: string;
};

export type MatchConditionInput = {
  eventName?: string;
  participantCount: number;
  participants: ParticipantInput[];
  courtCount: number;
  roundCount: number;
};

export type Participant = {
  id: string;
  name: string;
  index: number;
};

export type MatchConditions = {
  eventName?: string;
  participants: Participant[];
  courtCount: number;
  roundCount: number;
  playersPerCourt: 4;
};

export type Pair = {
  player1Id: string;
  player2Id: string;
};

export type CourtAssignment = {
  courtNumber: number;
  pairA: Pair | null;
  pairB: Pair | null;
  isUnused: boolean;
};

export type RoundResult = {
  roundNumber: number;
  courts: CourtAssignment[];
  restPlayerIds: string[];
  activePlayerIds: string[];
};

export type ResultScore = {
  fairnessPenalty: number;
  consecutiveRestPenalty: number;
  encounterPenalty: number;
  sameTeammatePenalty: number;
  sameOpponentPenalty: number;
  totalScore: number;
};

export type PlayerStats = {
  playerId: string;
  appearances: number;
  rests: number;
  uniqueEncounterCount: number;
  consecutiveRestCount: number;
};

export type MatchupResult = {
  conditions: MatchConditions;
  rounds: RoundResult[];
  stats: PlayerStats[];
  seed: number;
  score: ResultScore;
  generatedAt: string;
};

export type PairCountMatrix = Record<string, Record<string, number>>;

export type GenerationContext = {
  conditions: MatchConditions;
  seed: number;
  restCounts: Record<string, number>;
  appearanceCounts: Record<string, number>;
  courtAppearanceCounts: Record<string, Record<number, number>>;
  courtUsageCounts: Record<number, number>;
  encounterMatrix: PairCountMatrix;
  teammateMatrix: PairCountMatrix;
  opponentMatrix: PairCountMatrix;
  restHistoryByRound: string[][];
  activeHistoryByRound: string[][];
};

export type PrintModel = MatchupResult;
