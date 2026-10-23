"""
Deterministic Aid Compatibility Engine for TheSaviour.
Implements declarative, unit-tested compatibility checks between donation aid types
and shelter capabilities as specified in README section 7.
"""

from typing import Dict, List, Optional
from app.models import (
    DonationCategory,
    Shelter,
    ShelterStatus,
    CompatibilityCheckResult,
)

# Declarative compatibility rules mapping donation category to required capabilities and rationale
COMPATIBILITY_RULES: Dict[DonationCategory, Dict[str, any]] = {
    DonationCategory.INFANT_FORMULA: {
        "requires": ["has_water"],
        "reasons": {
            "has_water": "Infant formula requires verified potable water supply for safe preparation.",
        },
    },
    DonationCategory.RAW_RATION_KIT: {
        "requires": ["has_fuel", "has_water"],
        "reasons": {
            "has_fuel": "Raw ration kits require cooking fuel (gas/stove) for meal preparation.",
            "has_water": "Raw ration kits require clean water supply for cooking and sanitation.",
        },
    },
    DonationCategory.REFRIGERATED_MEDICINE: {
        "requires": ["has_refrigeration"],
        "reasons": {
            "has_refrigeration": "Refrigerated pharmaceuticals strictly require operational cold chain storage (2-8°C).",
        },
    },
    DonationCategory.COOKED_MEAL: {
        "requires": [],
        "reasons": {},
    },
    DonationCategory.BAKERY_PRODUCE: {
        "requires": [],
        "reasons": {},
    },
}


def evaluate_compatibility(
    shelter: Shelter,
    category: DonationCategory,
    quantity: Optional[int] = None,
) -> CompatibilityCheckResult:
    """
    Deterministically verify whether a shelter can safely accept an aid category
    based on operational status, utility capabilities, capacity, and demand.
    """
    missing_caps: List[str] = []
    reasons: List[str] = []
    warnings: List[str] = []

    # 1. Operational Status Gate
    if shelter.status == ShelterStatus.CLOSED:
        reasons.append(f"Shelter '{shelter.name}' is currently CLOSED and cannot accept inbound deliveries.")
        return CompatibilityCheckResult(
            is_compatible=False,
            shelter_id=shelter.id,
            shelter_name=shelter.name,
            category=category,
            missing_capabilities=[],
            reasons=reasons,
            warnings=warnings,
            max_acceptable_quantity=0,
        )

    # 2. Dependency / Capability Gate (Water, Fuel, Cold Storage)
    rule = COMPATIBILITY_RULES.get(category, {"requires": [], "reasons": {}})
    required_caps = rule.get("requires", [])
    cap_reasons = rule.get("reasons", {})

    for cap in required_caps:
        has_cap = getattr(shelter.capabilities, cap, False)
        if not has_cap:
            missing_caps.append(cap)
            reason_text = cap_reasons.get(
                cap,
                f"Shelter lacks mandatory operational capability: {cap}."
            )
            reasons.append(reason_text)

    # 3. Capacity & Demand Bounds
    free_capacity = max(0, shelter.capacity - shelter.current_occupancy)
    
    # Acceptable quantity bounded by demand or physical space
    if shelter.needed_meals > 0 and free_capacity > 0:
        max_acceptable = min(shelter.needed_meals, free_capacity)
    elif shelter.needed_meals > 0:
        max_acceptable = shelter.needed_meals
    else:
        max_acceptable = free_capacity

    if free_capacity <= 0 and shelter.status == ShelterStatus.AT_CAPACITY:
        reasons.append(f"Shelter '{shelter.name}' is AT_CAPACITY with 0 remaining bed/storage slots.")

    if shelter.needed_meals <= 0:
        warnings.append(f"Shelter has 0 active meal demand declared (needed_meals = 0).")

    if quantity is not None and quantity > 0:
        if quantity > max_acceptable > 0:
            warnings.append(
                f"Offered quantity ({quantity}) exceeds shelter's immediate demand/capacity ({max_acceptable}). "
                f"Multi-shelter parcel splitting will be required."
            )

    # 4. Preferred Needs Affinity Check
    if shelter.needed_categories and category not in shelter.needed_categories:
        warnings.append(
            f"Category '{category.value}' is not currently in the shelter's prioritized category list."
        )

    is_compatible = (len(missing_caps) == 0) and (shelter.status != ShelterStatus.CLOSED) and (max_acceptable > 0 or free_capacity > 0 or shelter.needed_meals > 0)

    if is_compatible and not reasons:
        reasons.append(
            f"All operational dependencies satisfied. Shelter is ready to receive {category.value}."
        )

    return CompatibilityCheckResult(
        is_compatible=is_compatible,
        shelter_id=shelter.id,
        shelter_name=shelter.name,
        category=category,
        missing_capabilities=missing_caps,
        reasons=reasons,
        warnings=warnings,
        max_acceptable_quantity=max_acceptable,
    )
