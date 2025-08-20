import { THERMAL_DATA } from '@/constants/thermalData';
import { PRODUCTS, STORAGE_FACTORS } from '@/constants/productData';
import { RESPIRATION_FACTORS } from '@/constants/coldRoomData';

interface RoomData {
  length: string;
  width: string;
  height: string;
  doorWidth: string;
  doorHeight: string;
  doorOpenings: string;
  insulationType: string;
  insulationThickness: number;
}

interface ConditionsData {
  externalTemp: string;
  internalTemp: string;
  operatingHours: string;
  pullDownTime: string;
}

interface ProductData {
  productType: string;
  dailyLoad: string;
  incomingTemp: string;
  outgoingTemp: string;
  storageType: string;
  numberOfPeople: string;
  workingHours: string;
  lightingWattage: string;
  equipmentLoad: string;
}

export function calculateColdRoomLoad(
  roomData: RoomData, 
  conditionsData: ConditionsData, 
  productData: ProductData
) {
  // Parse input values with cold room defaults
  const length = parseFloat(roomData.length) || 6.0;
  const width = parseFloat(roomData.width) || 4.0;
  const height = parseFloat(roomData.height) || 3.0;
  const doorWidth = parseFloat(roomData.doorWidth) || 1.2;
  const doorHeight = parseFloat(roomData.doorHeight) || 2.1;
  const doorOpenings = parseFloat(roomData.doorOpenings) || 30;
  const insulationType = roomData.insulationType || 'PUF';
  const insulationThickness = roomData.insulationThickness || 100;
  
  const externalTemp = parseFloat(conditionsData.externalTemp) || 35;
  const internalTemp = parseFloat(conditionsData.internalTemp) || 4;
  const operatingHours = parseFloat(conditionsData.operatingHours) || 24;
  const pullDownTime = parseFloat(conditionsData.pullDownTime) || 8;
  
  const dailyLoad = parseFloat(productData.dailyLoad) || 3000;
  const incomingTemp = parseFloat(productData.incomingTemp) || 25;
  const outgoingTemp = parseFloat(productData.outgoingTemp) || 4;
  const numberOfPeople = parseFloat(productData.numberOfPeople) || 3;
  const workingHours = parseFloat(productData.workingHours) || 8;
  const lightingWattage = parseFloat(productData.lightingWattage) || 300;
  const equipmentLoad = parseFloat(productData.equipmentLoad) || 750;
  
  // Calculate areas and volume
  const wallArea = 2 * (length * height) + 2 * (width * height);
  const ceilingArea = length * width;
  const floorArea = length * width;
  const volume = length * width * height;
  const doorArea = doorWidth * doorHeight;
  
  // Temperature difference
  const temperatureDifference = externalTemp - internalTemp;
  
  // Get U-factor from construction data
  const insulationTypeKey = insulationType as keyof typeof THERMAL_DATA.uFactors;
  const thickness = insulationThickness as keyof typeof THERMAL_DATA.uFactors.PUF;
  const uFactor = THERMAL_DATA.uFactors[insulationTypeKey]?.[thickness] || 0.25;
  
  // Get product and storage data
  const product = PRODUCTS[productData.productType as keyof typeof PRODUCTS] || PRODUCTS["General Food Items"];
  const storageFactor = STORAGE_FACTORS[productData.storageType as keyof typeof STORAGE_FACTORS] || STORAGE_FACTORS["Palletized"];
  
  // Calculate storage capacity
  const maxStorageCapacity = volume * product.density * product.storageEfficiency * storageFactor;
  const storageUtilization = (dailyLoad / maxStorageCapacity) * 100;
  
  // 1. EXACT Excel Formula: Transmission Load (Q = U × A × ΔT × hrs)
  const calculateTransmissionLoad = () => {
    const tempDiff = temperatureDifference;
    const hours = operatingHours;
    
    const wallLoad = (uFactor * wallArea * tempDiff * hours) / 1000; // Convert to kW
    const ceilingLoad = (uFactor * ceilingArea * tempDiff * hours) / 1000;
    const floorLoad = (uFactor * floorArea * tempDiff * hours) / 1000;
    
    return {
      walls: wallLoad,
      ceiling: ceilingLoad,
      floor: floorLoad,
      total: wallLoad + ceilingLoad + floorLoad
    };
  };
  
  // 2. EXACT Excel Formula: Product Load ((Mass × Cp × ΔT × 24) / pullDownTime)
  const calculateProductLoad = () => {
    const mass = dailyLoad;
    const tempDiff = incomingTemp - outgoingTemp;
    
    // Cold room: only sensible heat above freezing (no latent heat)
    const productLoad = (mass * product.specificHeatAbove * tempDiff * 24) / (pullDownTime * 1000);
    // Convert kJ/day to kW: divide by pullDownTime, then by 1000
    
    return productLoad;
  };
  
  // 3. NEW: Respiration Load (Mass × factor × 24)
  const calculateRespirationLoad = () => {
    const factors = RESPIRATION_FACTORS[productData.productType as keyof typeof RESPIRATION_FACTORS] || { 0: 0, 5: 0, 10: 0 };
    
    // Interpolate respiration factor based on internal temperature
    let respirationFactor = 0;
    if (internalTemp <= 0) respirationFactor = factors[0];
    else if (internalTemp <= 5) {
      respirationFactor = factors[0] + (factors[5] - factors[0]) * (internalTemp / 5);
    } else if (internalTemp <= 10) {
      respirationFactor = factors[5] + (factors[10] - factors[5]) * ((internalTemp - 5) / 5);
    } else {
      respirationFactor = factors[10];
    }
    
    const mass = dailyLoad / 1000; // Convert kg to tonnes
    return (mass * respirationFactor * 24) / 1000; // Convert W to kW, include 24 hours
  };
  
  // 4. EXACT Excel Formula: Air Change Load (Air change rate × Enthalpy diff × 3600 × hrs / 1000)
  const calculateAirChangeLoad = () => {
    const roomVolume = volume;
    const airChangeRate = 0.3; // Cold room specific
    
    // Excel method: Use enthalpy difference
    const enthalpyDiffPerKg = 1.006 * temperatureDifference; // kJ/kg
    const airMassFlow = roomVolume * 1.2 * airChangeRate; // kg/hr (volume × density × ACH)
    
    const airLoad = (airMassFlow * enthalpyDiffPerKg * operatingHours) / 1000; // Convert to kW
    
    return airLoad;
  };
  
  // 5. EXACT Excel Formula: Door Opening Load (capacity × hours × doors)
  const calculateDoorLoad = () => {
    const tempDiff = temperatureDifference;
    
    // Excel uses heater capacity method
    // Approximate heater capacity needed per m² per °C difference
    const heaterCapacityPerM2PerDegree = 50; // W/m²/°C (typical for cold room doors)
    const operatingFraction = doorOpenings / 100; // Convert openings to operating fraction
    
    const doorLoad = (doorArea * tempDiff * heaterCapacityPerM2PerDegree * operatingFraction * operatingHours) / (1000 * 24);
    
    return doorLoad;
  };
  
  // 6. EXACT Excel Formula: Miscellaneous Loads (Loads × usage hrs)
  const calculateMiscLoads = () => {
    const occupancyLoad = (numberOfPeople * 0.407 * workingHours) / 24; // kW
    const lightingLoad = (lightingWattage * operatingHours) / (1000 * 24); // kW
    const equipmentLoadKW = (equipmentLoad * operatingHours) / (1000 * 24); // kW
    
    return {
      occupancy: occupancyLoad,
      lighting: lightingLoad,
      equipment: equipmentLoadKW,
      total: occupancyLoad + lightingLoad + equipmentLoadKW
    };
  };
  
  // 7. NEW: Heater Loads (peripheral heaters, tray heaters)
  const calculateHeaterLoads = () => {
    // Peripheral heaters (around door frames)
    const peripheralHeaters = doorArea * 100; // W/m² typical
    const peripheralLoad = (peripheralHeaters * operatingHours) / (1000 * 24);
    
    // Tray heaters (if any)
    const trayHeaterCapacity = 500; // W (default)
    const trayLoad = (trayHeaterCapacity * operatingHours) / (1000 * 24);
    
    return {
      peripheral: peripheralLoad,
      tray: trayLoad,
      total: peripheralLoad + trayLoad
    };
  };
  
  // Calculate all loads
  const transmissionLoad = calculateTransmissionLoad();
  const productLoad = calculateProductLoad();
  const respirationLoad = calculateRespirationLoad();
  const airLoad = calculateAirChangeLoad();
  const doorLoad = calculateDoorLoad();
  const miscLoads = calculateMiscLoads();
  const heaterLoads = calculateHeaterLoads();
  
  // 8. Total Load Calculation (Excel Method)
  const totalLoad = transmissionLoad.total + productLoad + respirationLoad + 
                   airLoad + doorLoad + miscLoads.total + heaterLoads.total;
  
  const safetyFactor = 1.1; // 10%
  const finalLoad = totalLoad * safetyFactor;
  
  // Conversions (exact Excel match)
  const totalTR = finalLoad / 3.517; // kW to TR
  const totalBTU = finalLoad * 3412; // kW to BTU/hr
  
  return {
    dimensions: { length, width, height },
    doorDimensions: { width: doorWidth, height: doorHeight },
    areas: {
      wall: wallArea,
      ceiling: ceilingArea,
      floor: floorArea,
      door: doorArea
    },
    volume,
    storageCapacity: {
      maximum: maxStorageCapacity,
      utilization: storageUtilization,
      storageFactor: storageFactor,
      storageType: productData.storageType
    },
    temperatureDifference,
    pullDownTime,
    construction: {
      type: insulationType,
      thickness: insulationThickness,
      uFactor
    },
    productInfo: {
      type: productData.productType,
      mass: dailyLoad,
      incomingTemp,
      outgoingTemp,
      properties: product
    },
    doorOpenings,
    workingHours,
    breakdown: {
      transmission: transmissionLoad,
      product: productLoad,
      respiration: respirationLoad,
      airChange: airLoad,
      doorOpening: doorLoad,
      miscellaneous: miscLoads,
      heaters: heaterLoads
    },
    totalBeforeSafety: totalLoad,
    safetyFactorLoad: finalLoad - totalLoad,
    finalLoad: finalLoad,
    totalTR: totalTR,
    totalBTU: totalBTU,
    // Legacy compatibility
    transmissionLoad: transmissionLoad,
    productLoad: { total: productLoad, sensible: productLoad },
    airInfiltrationLoad: airLoad,
    internalLoads: miscLoads,
    doorLoad: doorLoad,
    totalLoad: totalLoad,
    totalLoadWithSafety: finalLoad,
    refrigerationTons: totalTR,
    airChangeRate: 0.3
  };
}