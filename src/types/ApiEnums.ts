export enum PurchaseSystem {
  // FCFS = 0,  // implicit if not lottery
  LOTTERY = 1,
  FREE_COMPANY = 2,
  INDIVIDUAL = 4,
}

export enum LottoPhase {
  ENTRY = 1,
  RESULTS = 2,
  UNAVAILABLE = 3,
}

export enum HouseSize {
  SMALL = 0,
  MEDIUM = 1,
  LARGE = 2,
}

export enum DistrictId {
  MIST = 339,
  THE_LAVENDER_BEDS = 340,
  THE_GOBLET = 341,
  SHIROGANE = 641,
  EMPYREUM = 979,
}
