export const API_BASE = "https://chappie-demo.novosense.africa:5555"

export const DANCE_TYPES = [
  // Ballroom Dances
  "AMERICAN SMOOTH WALTZ",
  "AMERICAN SMOOTH TANGO",
  "AMERICAN SMOOTH VIENNESE WALTZ",
  "AMERICAN SMOOTH FOX TROT",
  "INTERNATIONAL WALTZ",
  "INTERNATIONAL TANGO",
  "INTERNATIONAL VIENNESE WALTZ",
  "INTERNATIONAL SLOW FOX TROT",
  "INTERNATIONAL QUICKSTEP",

  // Latin Dances
  "INTERNATIONAL SAMBA",
  "INTERNATIONAL CHA CHA CHA",
  "INTERNATIONAL RUMBA",
  "INTERNATIONAL PASO DOBLE",
  "INTERNATIONAL JIVE",

  // Duo Dances
  "CONTEMPORARY",
  "KRUMPING",
  "CROSSDANCE",
  "TRADITIONAL",
  "HIP HOP",
  "BACHATA",
  "SALSA",
  "FREESTYLE",
  "MAMBO",
  "AFROBEAT",
  "BALLET",

  // Formation Dances
  "FORMATION STANDARD",
  "FORMATION LATIN",
  "FORMATION MIXED",
  "FORMATION THEATRICAL",
  "FORMATION TRADITIONAL",
]

export const ADMIN_UIDS = ["iMTsoOPrg6eR4rlJmaL1f0pA07Y2"]

export const getDanceTypesByAnalysisType = (type: string) => {
  if (type === "couple") {
    return DANCE_TYPES.slice(0, 24)
  } else if (type === "solo") {
    return DANCE_TYPES.slice(0, 24)
  } else if (type === "formation") {
    return DANCE_TYPES.slice(25, 30)
  } else {
    // duo
    return DANCE_TYPES.slice(0, 24)
  }
}
