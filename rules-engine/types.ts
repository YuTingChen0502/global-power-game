export type CountryId =
  | "usa"
  | "china"
  | "russia"
  | "eu"
  | "india"
  | "japan"
  | "ukraine"
  | "taiwan"
  | "australia";

export type RegionId =
  | "china_eastern_coast"
  | "china_western_frontier"
  | "china_northern_command"
  | "usa_indo_pacific_base"
  | "usa_homeland_atlantic"
  | "russia_europe"
  | "russia_far_east"
  | "india_northern_border"
  | "india_peninsula"
  | "eu_eastern_flank"
  | "eu_western_seaboard"
  | "japan"
  | "taiwan"
  | "australia"
  | "ukraine"
  | "asean"
  | "central_asia"
  | "middle_east"
  | "korean_peninsula"
  | "south_china_sea"
  | "malacca_strait"
  | "hormuz_strait"
  | "giuk_gap";

export type RegionKind = "land" | "coastal_land" | "resource_land" | "buffer_land" | "sea_zone" | "strait";

export type RegionEdgeType = "land" | "special_land_bridge";

export type UnitType = "army" | "navy";

export type OrderActionType =
  | "move"
  | "attack"
  | "defend"
  | "support_attack"
  | "support_defend"
  | "amphibious_attack"
  | "chip_disrupt"
  | "declare_embargo"
  | "request_asylum"
  | "approve_asylum"
  | "reject_asylum"
  | "revoke_asylum"
  | "effect_selection";

export type OrderStatus = "draft" | "submitted" | "submitted_pending" | "valid" | "invalid" | "resolved" | "cancelled";

export type CompoundRole = "parent" | "naval_carrier" | "land_payload";

export type GamePhase =
  | "setup"
  | "deployment"
  | "order_submission"
  | "admin_review"
  | "adjudication_preview"
  | "adjudication_committed"
  | "published"
  | "effect_selection"
  | "paused"
  | "completed";

export type StatusEffectType = "chip_disrupted" | "embargo_frozen" | "asylum_active" | "exiled_navy";

export type UnitAdjustmentType = "add_unit" | "remove_unit" | "offset_loss";

export type GameEventType =
  | "round_started"
  | "phase_changed"
  | "order_submitted"
  | "order_invalidated"
  | "battle_started"
  | "naval_battle_resolved"
  | "land_battle_resolved"
  | "amphibious_stage_resolved"
  | "unit_destroyed"
  | "region_control_changed"
  | "status_effect_created"
  | "status_effect_resolved"
  | "unit_adjustment_created"
  | "hegemon_declared"
  | "ruling_applied"
  | "battle_report_published"
  | "snapshot_created"
  | "rollback_applied";

export type SpecialPowerKey = "chip_disruption";

export type NavalAccessType = "global" | "coastal" | "home_port" | "standard" | "nearby_only" | "review_needed";
