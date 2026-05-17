-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Ruleset" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ruleset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "phase" TEXT NOT NULL DEFAULT 'setup',
    "currentRoundNumber" INTEGER NOT NULL DEFAULT 1,
    "rulesetId" TEXT NOT NULL,
    "serverVersion" INTEGER NOT NULL DEFAULT 1,
    "publicStateJson" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'setup',
    "deadlineAt" TIMESTAMP(3),
    "adjudicatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "serverVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "englishName" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "initialArmy" INTEGER NOT NULL,
    "initialNavy" INTEGER NOT NULL,
    "color" TEXT,
    "specialPowerKey" TEXT,
    "isLandlocked" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "englishName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "isResource" BOOLEAN NOT NULL DEFAULT false,
    "isHomeland" BOOLEAN NOT NULL DEFAULT false,
    "homelandCountryId" TEXT,
    "svgX" DOUBLE PRECISION NOT NULL,
    "svgY" DOUBLE PRECISION NOT NULL,
    "svgLabelX" DOUBLE PRECISION,
    "svgLabelY" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionEdge" (
    "id" TEXT NOT NULL,
    "fromRegionId" TEXT NOT NULL,
    "toRegionId" TEXT NOT NULL,
    "edgeType" TEXT NOT NULL DEFAULT 'land',
    "isBidirectional" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryNavalAccess" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "accessType" TEXT NOT NULL DEFAULT 'standard',
    "note" TEXT,
    "isReviewNeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryNavalAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionControl" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "countryId" TEXT,
    "controlType" TEXT NOT NULL DEFAULT 'controlled',
    "source" TEXT,
    "serverVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitStack" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isExiled" BOOLEAN NOT NULL DEFAULT false,
    "asylumGrantId" TEXT,
    "serverVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitStack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "submittedByPlayerId" TEXT,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "originRegionId" TEXT,
    "targetRegionId" TEXT,
    "targetCountryId" TEXT,
    "targetUnitStackId" TEXT,
    "unitType" TEXT,
    "unitCount" INTEGER,
    "countsTowardLimit" BOOLEAN NOT NULL DEFAULT true,
    "parentOrderId" TEXT,
    "compoundRole" TEXT,
    "supportOrderId" TEXT,
    "supportCountryId" TEXT,
    "supportActionType" TEXT,
    "supportTargetRegionId" TEXT,
    "pairedOrderId" TEXT,
    "clientMutationId" TEXT,
    "serverVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB,
    "validationSummary" JSONB,
    "adminNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusEffect" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "timing" TEXT,
    "sourceCountryId" TEXT,
    "targetCountryId" TEXT,
    "unitStackId" TEXT,
    "regionId" TEXT,
    "orderId" TEXT,
    "startsAtRound" INTEGER,
    "expiresAtRound" INTEGER,
    "serverVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsylumGrant" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "hostCountryId" TEXT NOT NULL,
    "guestCountryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "requestedOrderId" TEXT,
    "approvedOrderId" TEXT,
    "revokedOrderId" TEXT,
    "startRoundId" TEXT,
    "endRoundId" TEXT,
    "termsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsylumGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT,
    "battleReportId" TEXT,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "countryId" TEXT,
    "regionId" TEXT,
    "orderId" TEXT,
    "title" TEXT,
    "message" TEXT,
    "payload" JSONB,
    "serverVersion" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "battleReportId" TEXT,
    "regionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleReport" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "payload" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattleReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundHegemon" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "unitTotal" INTEGER NOT NULL,
    "armyTotal" INTEGER NOT NULL,
    "navyTotal" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundHegemon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundEffect" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "sourceRoundId" TEXT,
    "effectiveRoundId" TEXT NOT NULL,
    "countryId" TEXT,
    "targetCountryId" TEXT,
    "effectType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitAdjustment" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "sourceRoundId" TEXT,
    "targetRoundId" TEXT,
    "countryId" TEXT NOT NULL,
    "unitType" TEXT,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "regionId" TEXT,
    "sourceEventId" TEXT,
    "payload" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameStateSnapshot" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "stateJson" JSONB NOT NULL,
    "serverVersion" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameStateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "gameId" TEXT,
    "roundId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "reason" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "metadata" JSONB,
    "clientMutationId" TEXT,
    "serverVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruling" (
    "id" TEXT NOT NULL,
    "gameId" TEXT,
    "roundId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "precedence" TEXT,
    "tags" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ruling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlayer" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "displayName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'player',
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryInviteCode" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "redeemedByPlayerId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderVersion" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "editedByType" TEXT NOT NULL,
    "editedById" TEXT,
    "status" TEXT,
    "payload" JSONB NOT NULL,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMutation" (
    "id" TEXT NOT NULL,
    "clientMutationId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundId" TEXT,
    "playerId" TEXT,
    "countryId" TEXT,
    "mutationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "serverVersion" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientMutation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ruleset_key_key" ON "Ruleset"("key");

-- CreateIndex
CREATE INDEX "Ruleset_key_status_idx" ON "Ruleset"("key", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");

-- CreateIndex
CREATE INDEX "Game_rulesetId_idx" ON "Game"("rulesetId");

-- CreateIndex
CREATE INDEX "Game_code_status_idx" ON "Game"("code", "status");

-- CreateIndex
CREATE INDEX "Game_updatedAt_idx" ON "Game"("updatedAt");

-- CreateIndex
CREATE INDEX "Round_gameId_phase_idx" ON "Round"("gameId", "phase");

-- CreateIndex
CREATE INDEX "Round_gameId_number_idx" ON "Round"("gameId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Round_gameId_number_key" ON "Round"("gameId", "number");

-- CreateIndex
CREATE INDEX "Country_tier_idx" ON "Country"("tier");

-- CreateIndex
CREATE INDEX "Region_kind_idx" ON "Region"("kind");

-- CreateIndex
CREATE INDEX "Region_isResource_idx" ON "Region"("isResource");

-- CreateIndex
CREATE INDEX "Region_homelandCountryId_idx" ON "Region"("homelandCountryId");

-- CreateIndex
CREATE INDEX "Region_sortOrder_idx" ON "Region"("sortOrder");

-- CreateIndex
CREATE INDEX "RegionEdge_fromRegionId_idx" ON "RegionEdge"("fromRegionId");

-- CreateIndex
CREATE INDEX "RegionEdge_toRegionId_idx" ON "RegionEdge"("toRegionId");

-- CreateIndex
CREATE INDEX "RegionEdge_edgeType_idx" ON "RegionEdge"("edgeType");

-- CreateIndex
CREATE UNIQUE INDEX "RegionEdge_fromRegionId_toRegionId_edgeType_key" ON "RegionEdge"("fromRegionId", "toRegionId", "edgeType");

-- CreateIndex
CREATE INDEX "CountryNavalAccess_countryId_idx" ON "CountryNavalAccess"("countryId");

-- CreateIndex
CREATE INDEX "CountryNavalAccess_regionId_idx" ON "CountryNavalAccess"("regionId");

-- CreateIndex
CREATE INDEX "CountryNavalAccess_accessType_idx" ON "CountryNavalAccess"("accessType");

-- CreateIndex
CREATE UNIQUE INDEX "CountryNavalAccess_countryId_regionId_key" ON "CountryNavalAccess"("countryId", "regionId");

-- CreateIndex
CREATE INDEX "RegionControl_gameId_roundId_idx" ON "RegionControl"("gameId", "roundId");

-- CreateIndex
CREATE INDEX "RegionControl_countryId_idx" ON "RegionControl"("countryId");

-- CreateIndex
CREATE INDEX "RegionControl_regionId_idx" ON "RegionControl"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionControl_gameId_roundId_regionId_key" ON "RegionControl"("gameId", "roundId", "regionId");

-- CreateIndex
CREATE INDEX "UnitStack_gameId_roundId_countryId_idx" ON "UnitStack"("gameId", "roundId", "countryId");

-- CreateIndex
CREATE INDEX "UnitStack_regionId_idx" ON "UnitStack"("regionId");

-- CreateIndex
CREATE INDEX "UnitStack_unitType_status_idx" ON "UnitStack"("unitType", "status");

-- CreateIndex
CREATE INDEX "UnitStack_asylumGrantId_idx" ON "UnitStack"("asylumGrantId");

-- CreateIndex
CREATE INDEX "Order_gameId_roundId_countryId_idx" ON "Order"("gameId", "roundId", "countryId");

-- CreateIndex
CREATE INDEX "Order_gameId_roundId_status_idx" ON "Order"("gameId", "roundId", "status");

-- CreateIndex
CREATE INDEX "Order_parentOrderId_idx" ON "Order"("parentOrderId");

-- CreateIndex
CREATE INDEX "Order_supportOrderId_idx" ON "Order"("supportOrderId");

-- CreateIndex
CREATE INDEX "Order_targetUnitStackId_idx" ON "Order"("targetUnitStackId");

-- CreateIndex
CREATE INDEX "Order_clientMutationId_idx" ON "Order"("clientMutationId");

-- CreateIndex
CREATE INDEX "StatusEffect_gameId_roundId_idx" ON "StatusEffect"("gameId", "roundId");

-- CreateIndex
CREATE INDEX "StatusEffect_type_status_idx" ON "StatusEffect"("type", "status");

-- CreateIndex
CREATE INDEX "StatusEffect_targetCountryId_idx" ON "StatusEffect"("targetCountryId");

-- CreateIndex
CREATE INDEX "StatusEffect_unitStackId_idx" ON "StatusEffect"("unitStackId");

-- CreateIndex
CREATE INDEX "AsylumGrant_gameId_status_idx" ON "AsylumGrant"("gameId", "status");

-- CreateIndex
CREATE INDEX "AsylumGrant_hostCountryId_idx" ON "AsylumGrant"("hostCountryId");

-- CreateIndex
CREATE INDEX "AsylumGrant_guestCountryId_idx" ON "AsylumGrant"("guestCountryId");

-- CreateIndex
CREATE INDEX "GameEvent_gameId_roundId_sequence_idx" ON "GameEvent"("gameId", "roundId", "sequence");

-- CreateIndex
CREATE INDEX "GameEvent_type_idx" ON "GameEvent"("type");

-- CreateIndex
CREATE INDEX "GameEvent_visibility_idx" ON "GameEvent"("visibility");

-- CreateIndex
CREATE INDEX "GameEvent_countryId_idx" ON "GameEvent"("countryId");

-- CreateIndex
CREATE INDEX "GameEvent_createdAt_idx" ON "GameEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameEvent_gameId_roundId_sequence_key" ON "GameEvent"("gameId", "roundId", "sequence");

-- CreateIndex
CREATE INDEX "BattleEvent_gameId_roundId_sequence_idx" ON "BattleEvent"("gameId", "roundId", "sequence");

-- CreateIndex
CREATE INDEX "BattleEvent_battleReportId_idx" ON "BattleEvent"("battleReportId");

-- CreateIndex
CREATE INDEX "BattleEvent_regionId_idx" ON "BattleEvent"("regionId");

-- CreateIndex
CREATE INDEX "BattleReport_gameId_status_idx" ON "BattleReport"("gameId", "status");

-- CreateIndex
CREATE INDEX "BattleReport_publishedAt_idx" ON "BattleReport"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BattleReport_gameId_roundId_key" ON "BattleReport"("gameId", "roundId");

-- CreateIndex
CREATE INDEX "RoundHegemon_gameId_roundId_idx" ON "RoundHegemon"("gameId", "roundId");

-- CreateIndex
CREATE INDEX "RoundHegemon_countryId_idx" ON "RoundHegemon"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundHegemon_roundId_countryId_key" ON "RoundHegemon"("roundId", "countryId");

-- CreateIndex
CREATE INDEX "RoundEffect_gameId_effectiveRoundId_status_idx" ON "RoundEffect"("gameId", "effectiveRoundId", "status");

-- CreateIndex
CREATE INDEX "RoundEffect_effectType_idx" ON "RoundEffect"("effectType");

-- CreateIndex
CREATE INDEX "RoundEffect_countryId_idx" ON "RoundEffect"("countryId");

-- CreateIndex
CREATE INDEX "RoundEffect_targetCountryId_idx" ON "RoundEffect"("targetCountryId");

-- CreateIndex
CREATE INDEX "UnitAdjustment_gameId_countryId_status_idx" ON "UnitAdjustment"("gameId", "countryId", "status");

-- CreateIndex
CREATE INDEX "UnitAdjustment_targetRoundId_idx" ON "UnitAdjustment"("targetRoundId");

-- CreateIndex
CREATE INDEX "UnitAdjustment_reason_idx" ON "UnitAdjustment"("reason");

-- CreateIndex
CREATE INDEX "GameStateSnapshot_gameId_roundId_createdAt_idx" ON "GameStateSnapshot"("gameId", "roundId", "createdAt");

-- CreateIndex
CREATE INDEX "GameStateSnapshot_kind_idx" ON "GameStateSnapshot"("kind");

-- CreateIndex
CREATE INDEX "AuditLog_gameId_createdAt_idx" ON "AuditLog"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "AuditLog_clientMutationId_idx" ON "AuditLog"("clientMutationId");

-- CreateIndex
CREATE INDEX "Ruling_gameId_roundId_idx" ON "Ruling"("gameId", "roundId");

-- CreateIndex
CREATE INDEX "Ruling_status_idx" ON "Ruling"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_tokenHash_key" ON "GamePlayer"("tokenHash");

-- CreateIndex
CREATE INDEX "GamePlayer_gameId_countryId_idx" ON "GamePlayer"("gameId", "countryId");

-- CreateIndex
CREATE INDEX "GamePlayer_tokenHash_idx" ON "GamePlayer"("tokenHash");

-- CreateIndex
CREATE INDEX "GamePlayer_status_idx" ON "GamePlayer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_gameId_countryId_key" ON "GamePlayer"("gameId", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryInviteCode_codeHash_key" ON "CountryInviteCode"("codeHash");

-- CreateIndex
CREATE INDEX "CountryInviteCode_gameId_countryId_status_idx" ON "CountryInviteCode"("gameId", "countryId", "status");

-- CreateIndex
CREATE INDEX "CountryInviteCode_codeHash_idx" ON "CountryInviteCode"("codeHash");

-- CreateIndex
CREATE INDEX "OrderVersion_orderId_createdAt_idx" ON "OrderVersion"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderVersion_orderId_version_key" ON "OrderVersion"("orderId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ClientMutation_clientMutationId_key" ON "ClientMutation"("clientMutationId");

-- CreateIndex
CREATE INDEX "ClientMutation_gameId_status_idx" ON "ClientMutation"("gameId", "status");

-- CreateIndex
CREATE INDEX "ClientMutation_playerId_idx" ON "ClientMutation"("playerId");

-- CreateIndex
CREATE INDEX "ClientMutation_countryId_idx" ON "ClientMutation"("countryId");

-- CreateIndex
CREATE INDEX "ClientMutation_createdAt_idx" ON "ClientMutation"("createdAt");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_homelandCountryId_fkey" FOREIGN KEY ("homelandCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionEdge" ADD CONSTRAINT "RegionEdge_fromRegionId_fkey" FOREIGN KEY ("fromRegionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionEdge" ADD CONSTRAINT "RegionEdge_toRegionId_fkey" FOREIGN KEY ("toRegionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryNavalAccess" ADD CONSTRAINT "CountryNavalAccess_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryNavalAccess" ADD CONSTRAINT "CountryNavalAccess_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionControl" ADD CONSTRAINT "RegionControl_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionControl" ADD CONSTRAINT "RegionControl_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionControl" ADD CONSTRAINT "RegionControl_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionControl" ADD CONSTRAINT "RegionControl_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitStack" ADD CONSTRAINT "UnitStack_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitStack" ADD CONSTRAINT "UnitStack_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitStack" ADD CONSTRAINT "UnitStack_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitStack" ADD CONSTRAINT "UnitStack_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitStack" ADD CONSTRAINT "UnitStack_asylumGrantId_fkey" FOREIGN KEY ("asylumGrantId") REFERENCES "AsylumGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_submittedByPlayerId_fkey" FOREIGN KEY ("submittedByPlayerId") REFERENCES "GamePlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_originRegionId_fkey" FOREIGN KEY ("originRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_targetRegionId_fkey" FOREIGN KEY ("targetRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_targetCountryId_fkey" FOREIGN KEY ("targetCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_targetUnitStackId_fkey" FOREIGN KEY ("targetUnitStackId") REFERENCES "UnitStack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_parentOrderId_fkey" FOREIGN KEY ("parentOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_supportOrderId_fkey" FOREIGN KEY ("supportOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_supportCountryId_fkey" FOREIGN KEY ("supportCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_supportTargetRegionId_fkey" FOREIGN KEY ("supportTargetRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pairedOrderId_fkey" FOREIGN KEY ("pairedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEffect" ADD CONSTRAINT "StatusEffect_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEffect" ADD CONSTRAINT "StatusEffect_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEffect" ADD CONSTRAINT "StatusEffect_sourceCountryId_fkey" FOREIGN KEY ("sourceCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEffect" ADD CONSTRAINT "StatusEffect_targetCountryId_fkey" FOREIGN KEY ("targetCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEffect" ADD CONSTRAINT "StatusEffect_unitStackId_fkey" FOREIGN KEY ("unitStackId") REFERENCES "UnitStack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEffect" ADD CONSTRAINT "StatusEffect_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEffect" ADD CONSTRAINT "StatusEffect_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsylumGrant" ADD CONSTRAINT "AsylumGrant_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsylumGrant" ADD CONSTRAINT "AsylumGrant_hostCountryId_fkey" FOREIGN KEY ("hostCountryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsylumGrant" ADD CONSTRAINT "AsylumGrant_guestCountryId_fkey" FOREIGN KEY ("guestCountryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsylumGrant" ADD CONSTRAINT "AsylumGrant_requestedOrderId_fkey" FOREIGN KEY ("requestedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsylumGrant" ADD CONSTRAINT "AsylumGrant_approvedOrderId_fkey" FOREIGN KEY ("approvedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsylumGrant" ADD CONSTRAINT "AsylumGrant_revokedOrderId_fkey" FOREIGN KEY ("revokedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsylumGrant" ADD CONSTRAINT "AsylumGrant_startRoundId_fkey" FOREIGN KEY ("startRoundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsylumGrant" ADD CONSTRAINT "AsylumGrant_endRoundId_fkey" FOREIGN KEY ("endRoundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_battleReportId_fkey" FOREIGN KEY ("battleReportId") REFERENCES "BattleReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleEvent" ADD CONSTRAINT "BattleEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleEvent" ADD CONSTRAINT "BattleEvent_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleEvent" ADD CONSTRAINT "BattleEvent_battleReportId_fkey" FOREIGN KEY ("battleReportId") REFERENCES "BattleReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleEvent" ADD CONSTRAINT "BattleEvent_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleReport" ADD CONSTRAINT "BattleReport_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleReport" ADD CONSTRAINT "BattleReport_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundHegemon" ADD CONSTRAINT "RoundHegemon_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundHegemon" ADD CONSTRAINT "RoundHegemon_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundHegemon" ADD CONSTRAINT "RoundHegemon_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundEffect" ADD CONSTRAINT "RoundEffect_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundEffect" ADD CONSTRAINT "RoundEffect_sourceRoundId_fkey" FOREIGN KEY ("sourceRoundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundEffect" ADD CONSTRAINT "RoundEffect_effectiveRoundId_fkey" FOREIGN KEY ("effectiveRoundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundEffect" ADD CONSTRAINT "RoundEffect_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundEffect" ADD CONSTRAINT "RoundEffect_targetCountryId_fkey" FOREIGN KEY ("targetCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitAdjustment" ADD CONSTRAINT "UnitAdjustment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitAdjustment" ADD CONSTRAINT "UnitAdjustment_sourceRoundId_fkey" FOREIGN KEY ("sourceRoundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitAdjustment" ADD CONSTRAINT "UnitAdjustment_targetRoundId_fkey" FOREIGN KEY ("targetRoundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitAdjustment" ADD CONSTRAINT "UnitAdjustment_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitAdjustment" ADD CONSTRAINT "UnitAdjustment_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameStateSnapshot" ADD CONSTRAINT "GameStateSnapshot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameStateSnapshot" ADD CONSTRAINT "GameStateSnapshot_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruling" ADD CONSTRAINT "Ruling_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruling" ADD CONSTRAINT "Ruling_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryInviteCode" ADD CONSTRAINT "CountryInviteCode_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryInviteCode" ADD CONSTRAINT "CountryInviteCode_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryInviteCode" ADD CONSTRAINT "CountryInviteCode_redeemedByPlayerId_fkey" FOREIGN KEY ("redeemedByPlayerId") REFERENCES "GamePlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVersion" ADD CONSTRAINT "OrderVersion_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMutation" ADD CONSTRAINT "ClientMutation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMutation" ADD CONSTRAINT "ClientMutation_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMutation" ADD CONSTRAINT "ClientMutation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "GamePlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMutation" ADD CONSTRAINT "ClientMutation_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
