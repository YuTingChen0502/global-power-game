import type {
  CountryId,
  GameEventType,
  GamePhase,
  NavalAccessType,
  RegionEdgeType,
  RegionId,
  RegionKind,
  UnitType,
} from "@/rules-engine/types";

export type ApiWarning = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  events?: GameEventDTO[];
  warnings?: ApiWarning[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  clientMutationId?: string;
  serverVersion?: number;
};

export type GameDTO = {
  id: string;
  code: string;
  name: string;
  status: string;
  phase: GamePhase;
  currentRoundNumber: number;
  serverVersion: number;
  updatedAt: string;
};

export type RoundDTO = {
  id: string;
  gameId: string;
  number: number;
  phase: GamePhase;
  deadlineAt: string | null;
  serverVersion: number;
  updatedAt: string;
};

export type CountryDTO = {
  id: CountryId;
  displayName: string;
  englishName: string;
  tier: number;
  color: string | null;
  specialPowerKey: string | null;
  isLandlocked: boolean;
};

export type RegionDTO = {
  id: RegionId;
  displayName: string;
  englishName: string;
  kind: RegionKind;
  isResource: boolean;
  isHomeland: boolean;
  homelandCountryId: CountryId | null;
  svgX: number;
  svgY: number;
  svgLabelX: number | null;
  svgLabelY: number | null;
  sortOrder: number;
};

export type RegionEdgeDTO = {
  id: string;
  fromRegionId: RegionId;
  toRegionId: RegionId;
  edgeType: RegionEdgeType;
  isBidirectional: boolean;
  note: string | null;
};

export type RegionControlDTO = {
  id: string;
  gameId: string;
  roundId: string;
  regionId: RegionId;
  countryId: CountryId | null;
  controlType: string;
  serverVersion: number;
  updatedAt: string;
};

export type UnitStackDTO = {
  id: string;
  gameId: string;
  roundId: string;
  countryId: CountryId;
  regionId: RegionId;
  unitType: UnitType;
  count: number;
  status: string;
  isExiled: boolean;
  serverVersion: number;
  updatedAt: string;
};

export type CountryNavalAccessDTO = {
  id: string;
  countryId: CountryId;
  regionId: RegionId;
  accessType: NavalAccessType;
  note: string | null;
  isReviewNeeded: boolean;
};

export type GameEventDTO = {
  id: string;
  gameId: string;
  roundId: string | null;
  sequence: number;
  type: GameEventType;
  visibility: string;
  countryId: CountryId | null;
  regionId: RegionId | null;
  title: string | null;
  message: string | null;
  payload: unknown;
  serverVersion: number;
  occurredAt: string;
  createdAt: string;
};

export type PublicGameStateDTO = {
  game: GameDTO;
  round: RoundDTO;
  countries: CountryDTO[];
  regions: RegionDTO[];
  edges: RegionEdgeDTO[];
  controls: RegionControlDTO[];
  unitStacks: UnitStackDTO[];
  navalAccess: CountryNavalAccessDTO[];
  events: GameEventDTO[];
  serverVersion: number;
  updatedAt: string;
};

export type JoinGameResponseDTO = {
  playerToken: string;
  playerId: string;
  countryId: CountryId;
  gameId: string;
  country: CountryDTO;
};

export type RoundPatchDTO = Partial<RoundDTO> & Pick<RoundDTO, "id" | "gameId">;
export type GamePatchDTO = Partial<GameDTO> & Pick<GameDTO, "id">;

export type PublicRealtimePatch = {
  gameId: string;
  game?: GamePatchDTO;
  round?: RoundPatchDTO;
  controls?: RegionControlDTO[];
  unitStacks?: UnitStackDTO[];
  events?: GameEventDTO[];
  serverVersion?: number;
  updatedAt?: string;
  clientMutationId?: string;
};

export type SetPhaseResponseDTO = {
  game: GameDTO;
  round: RoundDTO;
  event: GameEventDTO;
};
