import type { CountryId, RegionEdgeType, RegionId, UnitType } from "./types";

export type PossibleTargetEdge = {
  fromRegionId: RegionId;
  toRegionId: RegionId;
  edgeType: RegionEdgeType;
  isBidirectional: boolean;
};

export type PossibleTargetNavalAccess = {
  countryId: CountryId;
  regionId: RegionId;
};

export type GetPossibleTargetsInput = {
  countryId: CountryId;
  originRegionId: RegionId;
  unitType: UnitType;
  edges: readonly PossibleTargetEdge[];
  navalAccess: readonly PossibleTargetNavalAccess[];
};

export type GetPossibleTargetsResult = {
  originRegionId: RegionId;
  unitType: UnitType;
  targetRegionIds: RegionId[];
};

export function getPossibleTargets(input: GetPossibleTargetsInput): GetPossibleTargetsResult {
  const targetRegionIds =
    input.unitType === "army" ? getLandTargets(input.originRegionId, input.edges) : getNavalTargets(input);

  return {
    originRegionId: input.originRegionId,
    unitType: input.unitType,
    targetRegionIds,
  };
}

function getLandTargets(originRegionId: RegionId, edges: readonly PossibleTargetEdge[]) {
  const targets = new Set<RegionId>();

  for (const edge of edges) {
    if (!isLandMovementEdge(edge.edgeType)) {
      continue;
    }

    if (edge.fromRegionId === originRegionId) {
      targets.add(edge.toRegionId);
    }

    if (edge.isBidirectional && edge.toRegionId === originRegionId) {
      targets.add(edge.fromRegionId);
    }
  }

  return [...targets].sort();
}

function getNavalTargets(input: GetPossibleTargetsInput) {
  const targets = new Set<RegionId>();

  for (const access of input.navalAccess) {
    if (access.countryId === input.countryId && access.regionId !== input.originRegionId) {
      targets.add(access.regionId);
    }
  }

  return [...targets].sort();
}

function isLandMovementEdge(edgeType: RegionEdgeType) {
  return edgeType === "land" || edgeType === "special_land_bridge";
}
