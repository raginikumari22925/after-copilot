// Cold Room specific constants and data
export const COLD_ROOM_DEFAULTS = {
  // Room specs (larger than freezer typically)
  length: 6.0,
  width: 4.0, 
  height: 3.0,
  doorWidth: 1.2,
  doorHeight: 2.1,
  
  // Operating conditions
  externalTemp: 35,
  internalTemp: 4, // Cold room typical
  operatingHours: 24,
  pullDownTime: 8, // Faster than freezer
  
  // Construction (same options as freezer)
  insulationType: "PUF",
  insulationThickness: 100,
  
  // Product & load
  productType: "General Food Items",
  dailyProductLoad: 3000, // Higher capacity
  productIncomingTemp: 25,
  productOutgoingTemp: 4, // Auto-fill from internal temp
  storageType: "Palletized",
  
  // Usage (more activity than freezer)
  numberOfPeople: 3,
  hoursWorking: 8,
  dailyDoorOpenings: 30, // More frequent access
  lightingWattage: 300,
  equipmentLoad: 750
};

// Respiration factors for fruits/vegetables (W/tonne at different temperatures)
export const RESPIRATION_FACTORS = {
  "Apples": { 0: 12, 5: 25, 10: 48 },
  "Potatoes": { 0: 8, 5: 15, 10: 28 },
  "Carrots": { 0: 10, 5: 20, 10: 35 },
  "Tomatoes": { 0: 15, 5: 30, 10: 55 },
  "Vegetables (Mixed)": { 0: 12, 5: 24, 10: 45 },
  "Fruits (Mixed)": { 0: 15, 5: 28, 10: 50 },
  // Other products have 0 respiration
  "General Food Items": { 0: 0, 5: 0, 10: 0 },
  "Beverages": { 0: 0, 5: 0, 10: 0 },
  "Dairy Products": { 0: 0, 5: 0, 10: 0 },
  "Pharmaceutical": { 0: 0, 5: 0, 10: 0 }
};