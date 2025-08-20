import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Share2 } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { calculateColdRoomLoad } from '@/utils/coldRoomCalculations';

// Try to import expo-print and expo-sharing, but don't fail if they're not available
let Print: any = null;
let Sharing: any = null;

try {
  Print = require('expo-print');
  Sharing = require('expo-sharing');
} catch (error) {
  console.log('PDF packages not available, will use text sharing fallback');
}

export default function ColdRoomResultsScreen() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const generateHTMLReport = () => {
    if (!results) return '';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Cold Room Cooling Load Report</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                line-height: 1.4; 
                color: #333;
            }
            .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #3B82F6; 
                padding-bottom: 20px;
            }
            .company-name {
                font-size: 28px;
                font-weight: bold;
                color: #1E3A8A;
                margin-bottom: 5px;
                letter-spacing: 2px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }
            .powered-by {
                font-size: 16px;
                color: #3B82F6;
                margin-bottom: 15px;
                font-weight: 600;
            }
            .title { 
                font-size: 24px; 
                font-weight: bold; 
                color: #1E3A8A; 
                margin: 10px 0;
            }
            .main-result { 
                background: linear-gradient(135deg, #1E3A8A, #3B82F6); 
                color: white; 
                padding: 20px; 
                border-radius: 10px; 
                text-align: center; 
                margin: 20px 0;
            }
            .main-value { 
                font-size: 32px; 
                font-weight: bold; 
                margin: 10px 0;
            }
            .section { 
                margin: 20px 0; 
                page-break-inside: avoid;
            }
            .section-title { 
                font-size: 18px; 
                font-weight: bold; 
                color: #1E3A8A; 
                border-bottom: 1px solid #E5E7EB; 
                padding-bottom: 5px; 
                margin-bottom: 15px;
            }
            .subsection {
                margin-bottom: 20px;
            }
            .subsection-title {
                font-size: 16px;
                font-weight: bold;
                color: #3B82F6;
                margin-bottom: 10px;
                padding-left: 10px;
                border-left: 3px solid #3B82F6;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 10px 0;
                background: white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            th, td { 
                border: 1px solid #E5E7EB; 
                padding: 8px; 
                text-align: center; 
                font-size: 12px;
            }
            th { 
                background: #EBF8FF; 
                font-weight: bold; 
                color: #1E3A8A;
            }
            .total-row { 
                background: #DBEAFE; 
                font-weight: bold;
            }
            .final-row { 
                background: #3B82F6; 
                color: white; 
                font-weight: bold;
            }
            .info-box { 
                background: #EBF8FF; 
                border-left: 4px solid #3B82F6; 
                padding: 15px; 
                margin: 10px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #E5E7EB;
                color: #666;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">ENZO ENGINEERING SOLUTIONS</div>
            <div class="powered-by">⚡ Powered by Enzo CoolCalc</div>
            <div class="title">🌡️ COLD ROOM COOLING LOAD CALCULATION REPORT</div>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>

        <div class="main-result">
            <div class="main-value">${results.finalLoad.toFixed(2)} kW</div>
            <div>Required Cooling Capacity</div>
            <div style="margin-top: 10px;">
                <div>Refrigeration: ${results.totalTR.toFixed(2)} TR</div>
                <div>Daily Energy: ${(results.finalLoad * 24).toFixed(1)} kWh</div>
                <div>Heat Removal: ${results.totalBTU.toFixed(0)} BTU/hr</div>
                <div>Safety Factor: 10%</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📋 INPUT PARAMETERS</div>
            
            <div class="subsection">
                <div class="subsection-title">🏗️ Room Construction</div>
                <div class="info-box">
                    <div><strong>Room Dimensions:</strong></div>
                    <div>• Length: ${results.dimensions.length} m</div>
                    <div>• Width: ${results.dimensions.width} m</div>
                    <div>• Height: ${results.dimensions.height} m</div>
                    <div>• Total Volume: ${results.volume.toFixed(1)} m³</div>
                </div>
                <div class="info-box">
                    <div><strong>Door Specifications:</strong></div>
                    <div>• Door Width: ${results.doorDimensions.width} m</div>
                    <div>• Door Height: ${results.doorDimensions.height} m</div>
                    <div>• Door Openings: ${results.roomData?.doorOpenings || 'N/A'} times/day</div>
                </div>
                <div class="info-box">
                    <div><strong>Insulation Details:</strong></div>
                    <div>• Insulation Type: ${results.construction.type}</div>
                    <div>• Thickness: ${results.construction.thickness} mm</div>
                    <div>• U-Factor: ${results.construction.uFactor.toFixed(3)} W/m²K</div>
                </div>
            </div>

            <div class="subsection">
                <div class="subsection-title">🌡️ Operating Conditions</div>
                <div class="info-box">
                    <div><strong>Temperature Settings:</strong></div>
                    <div>• External Temperature: ${results.roomData?.externalTemp || results.conditions?.externalTemp}°C</div>
                    <div>• Internal Temperature: ${results.roomData?.internalTemp || results.conditions?.internalTemp}°C</div>
                    <div>• Temperature Difference: ${results.temperatureDifference.toFixed(0)}°C</div>
                </div>
                <div class="info-box">
                    <div><strong>Operating Parameters:</strong></div>
                    <div>• Operating Hours: ${results.roomData?.operatingHours || 24} hours/day</div>
                    <div>• Pull-down Time: ${results.pullDownTime} hours</div>
                </div>
            </div>

            <div class="subsection">
                <div class="subsection-title">🥬 Product Information</div>
                <div class="info-box">
                    <div><strong>Product Details:</strong></div>
                    <div>• Product Type: ${results.productInfo.type}</div>
                    <div>• Daily Load: ${results.productInfo.mass} kg</div>
                    <div>• Incoming Temperature: ${results.productInfo.incomingTemp}°C</div>
                    <div>• Outgoing Temperature: ${results.productInfo.outgoingTemp}°C</div>
                    <div>• Storage Type: ${results.storageCapacity.storageType}</div>
                </div>
            </div>

            <div class="subsection">
                <div class="subsection-title">👥 Personnel & Equipment</div>
                <div class="info-box">
                    <div><strong>Personnel:</strong></div>
                    <div>• Number of People: ${results.roomData?.numberOfPeople || 3}</div>
                    <div>• Working Hours: ${results.roomData?.workingHours || 8} hours/day</div>
                </div>
                <div class="info-box">
                    <div><strong>Electrical Equipment:</strong></div>
                    <div>• Lighting Load: ${results.roomData?.lightingWattage || 300} W</div>
                    <div>• Equipment Load: ${results.roomData?.equipmentLoad || 750} W</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📈 FINAL SUMMARY</div>
            <table>
                <tr>
                    <th>Load Type</th>
                    <th>Load (kW)</th>
                    <th>Load (TR)</th>
                </tr>
                <tr>
                    <td>Transmission Load</td>
                    <td>${results.breakdown.transmission.total.toFixed(3)}</td>
                    <td>${(results.breakdown.transmission.total / 3.517).toFixed(3)}</td>
                </tr>
                <tr>
                    <td>Product Load</td>
                    <td>${results.breakdown.product.toFixed(3)}</td>
                    <td>${(results.breakdown.product / 3.517).toFixed(3)}</td>
                </tr>
                <tr>
                    <td>Respiration Load</td>
                    <td>${results.breakdown.respiration.toFixed(3)}</td>
                    <td>${(results.breakdown.respiration / 3.517).toFixed(3)}</td>
                </tr>
                <tr>
                    <td>Air Change Load</td>
                    <td>${results.breakdown.airChange.toFixed(3)}</td>
                    <td>${(results.breakdown.airChange / 3.517).toFixed(3)}</td>
                </tr>
                <tr>
                    <td>Door Opening Load</td>
                    <td>${results.breakdown.doorOpening.toFixed(3)}</td>
                    <td>${(results.breakdown.doorOpening / 3.517).toFixed(3)}</td>
                </tr>
                <tr>
                    <td>Internal Loads</td>
                    <td>${results.breakdown.miscellaneous.total.toFixed(3)}</td>
                    <td>${(results.breakdown.miscellaneous.total / 3.517).toFixed(3)}</td>
                </tr>
                <tr>
                    <td>Heater Loads</td>
                    <td>${results.breakdown.heaters.total.toFixed(3)}</td>
                    <td>${(results.breakdown.heaters.total / 3.517).toFixed(3)}</td>
                </tr>
                <tr>
                    <td>Total Calculated</td>
                    <td>${results.totalBeforeSafety.toFixed(3)}</td>
                    <td>${(results.totalBeforeSafety / 3.517).toFixed(3)}</td>
                </tr>
                <tr>
                    <td>Safety Factor (10%)</td>
                    <td>${results.safetyFactorLoad.toFixed(3)}</td>
                    <td>${(results.safetyFactorLoad / 3.517).toFixed(3)}</td>
                </tr>
                <tr class="final-row">
                    <td><strong>FINAL CAPACITY REQUIRED</strong></td>
                    <td><strong>${results.finalLoad.toFixed(2)}</strong></td>
                    <td><strong>${results.totalTR.toFixed(2)}</strong></td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <div style="font-size: 16px; font-weight: bold; color: #1E3A8A;">ENZO ENGINEERING SOLUTIONS</div>
            <div>Report generated by Enzo CoolCalc</div>
            <div>Professional Refrigeration Load Calculation System</div>
            <div>© ${new Date().getFullYear()} Enzo Engineering Solutions</div>
        </div>
    </body>
    </html>
    `;
  };

  const handleShare = async () => {
    try {
      // Try to generate PDF first if packages are available
      if (Print && Sharing) {
        try {
          const htmlContent = generateHTMLReport();
          const { uri } = await Print.printToFileAsync({
            html: htmlContent,
            base64: false
          });
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Share Cold Room Load Calculation Report',
              UTI: 'com.adobe.pdf'
            });
            return;
          }
        } catch (pdfError) {
          console.log('PDF generation failed, falling back to text:', pdfError);
        }
      }
      
      // Fallback to text sharing
      const content = generateTextReport();
      await Share.share({
        message: content,
        title: 'Cold Room Load Calculation Report'
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share report');
    }
  };

  const generateTextReport = () => {
    if (!results) return '';
    
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ENZO ENGINEERING SOLUTIONS
⚡ POWERED BY ENZO COOLCALC ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌡️ COLD ROOM COOLING LOAD CALCULATION REPORT
===========================================

📅 Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

🎯 FINAL RESULTS:
Required Capacity: ${results.finalLoad.toFixed(2)} kW
Refrigeration: ${results.totalTR.toFixed(2)} TR
Daily Energy: ${(results.finalLoad * 24).toFixed(1)} kWh
Heat Removal: ${results.totalBTU.toFixed(0)} BTU/hr
Safety Factor: 10%

📋 INPUT PARAMETERS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ ROOM CONSTRUCTION:
Dimensions: ${results.dimensions.length}m × ${results.dimensions.width}m × ${results.dimensions.height}m
Volume: ${results.volume.toFixed(1)} m³
Door Size: ${results.doorDimensions.width}m × ${results.doorDimensions.height}m
Door Openings: ${results.roomData?.doorOpenings || 'N/A'} times/day
Insulation: ${results.construction.type}
Thickness: ${results.construction.thickness}mm
U-Factor: ${results.construction.uFactor.toFixed(3)} W/m²K

🌡️ OPERATING CONDITIONS:
External Temperature: ${results.roomData?.externalTemp || results.conditions?.externalTemp}°C
Internal Temperature: ${results.roomData?.internalTemp || results.conditions?.internalTemp}°C
Temperature Difference: ${results.temperatureDifference.toFixed(0)}°C
Operating Hours: ${results.roomData?.operatingHours || 24} hours/day
Pull-down Time: ${results.pullDownTime} hours

🥬 PRODUCT INFORMATION:
Product Type: ${results.productInfo.type}
Daily Load: ${results.productInfo.mass} kg
Temperature Range: ${results.productInfo.incomingTemp}°C → ${results.productInfo.outgoingTemp}°C
Storage Type: ${results.storageCapacity.storageType}

👥 PERSONNEL & EQUIPMENT:
Number of People: ${results.roomData?.numberOfPeople || 3}
Working Hours: ${results.roomData?.workingHours || 8} hours/day
Lighting Load: ${results.roomData?.lightingWattage || 300} W
Equipment Load: ${results.roomData?.equipmentLoad || 750} W

📊 LOAD BREAKDOWN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Transmission Load: ${results.breakdown.transmission.total.toFixed(3)} kW
Product Load: ${results.breakdown.product.toFixed(3)} kW
Respiration Load: ${results.breakdown.respiration.toFixed(3)} kW
Air Change Load: ${results.breakdown.airChange.toFixed(3)} kW
Door Opening Load: ${results.breakdown.doorOpening.toFixed(3)} kW
Internal Loads: ${results.breakdown.miscellaneous.total.toFixed(3)} kW
Heater Loads: ${results.breakdown.heaters.total.toFixed(3)} kW

📈 CALCULATION SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Calculated: ${results.totalBeforeSafety.toFixed(3)} kW
Safety Factor (10%): ${results.safetyFactorLoad.toFixed(3)} kW
FINAL CAPACITY REQUIRED: ${results.finalLoad.toFixed(2)} kW

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by Enzo CoolCalc
ENZO ENGINEERING SOLUTIONS
Professional Refrigeration Load Calculation System
© ${new Date().getFullYear()} Enzo Engineering Solutions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
  };

  // Recalculate whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      calculateResults();
    }, [])
  );

  // Also set up a listener for storage changes
  useEffect(() => {
    const interval = setInterval(() => {
      calculateResults();
    }, 1000); // Check for changes every second

    return () => clearInterval(interval);
  }, []);

  const calculateResults = async () => {
    try {
      const roomData = await AsyncStorage.getItem('coldRoomData');
      const conditionsData = await AsyncStorage.getItem('coldRoomConditionsData');
      const constructionData = await AsyncStorage.getItem('coldRoomConstructionData');
      const productData = await AsyncStorage.getItem('coldRoomProductData');

      const room = roomData ? JSON.parse(roomData) : { 
        length: '6.0', width: '4.0', height: '3.0', doorWidth: '1.2', doorHeight: '2.1',
        doorOpenings: '30', insulationType: 'PUF', insulationThickness: 100 
      };
      
      const conditions = conditionsData ? JSON.parse(conditionsData) : { 
        externalTemp: '35', internalTemp: '4', operatingHours: '24', pullDownTime: '8' 
      };
      
      const construction = constructionData ? JSON.parse(constructionData) : {
        insulationType: 'PUF', insulationThickness: 100
      };
      
      const product = productData ? JSON.parse(productData) : { 
        productType: 'General Food Items', dailyLoad: '3000', incomingTemp: '25', outgoingTemp: '4',
        storageType: 'Palletized', numberOfPeople: '3', workingHours: '8',
        lightingWattage: '300', equipmentLoad: '750' 
      };

      // Merge construction data with room data
      const roomWithConstruction = { ...room, ...construction };

      const calculatedResults = calculateColdRoomLoad(roomWithConstruction, conditions, product);
      
      // Add input data to results for PDF generation
      const enhancedResults = {
        ...calculatedResults,
        roomData: { ...roomWithConstruction, ...conditions },
        conditions: conditions,
        productData: product
      };
      
      setResults(enhancedResults);
      setLoading(false);
    } catch (error) {
      console.error('Error calculating cold room results:', error);
      setLoading(false);
    }
  };

  if (loading || !results) {
    return (
      <LinearGradient colors={['#F8FAFC', '#EBF8FF']} style={styles.container}>
        <Header title="Cold Room Results" step={5} totalSteps={5} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Calculating cooling load...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#F8FAFC', '#EBF8FF']} style={styles.container}>
      <Header title="Cold Room Results" step={5} totalSteps={5} />
      
      {/* Powered by Enzo Banner */}
      <View style={styles.poweredByBanner}>
        <Text style={styles.poweredByText}>⚡ Powered by Enzo</Text>
      </View>
      
      <View style={styles.shareButtonsContainer}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 color="#3B82F6" size={20} strokeWidth={2} />
          <Text style={styles.shareButtonText}>Share PDF Report</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainResultCard}>
          <Text style={styles.mainResultTitle}>🌡 COLD ROOM LOAD CALCULATION</Text>
          <Text style={styles.mainResultValue}>{results.finalLoad.toFixed(2)} kW</Text>
          <Text style={styles.mainResultSubtitle}>Refrigeration: {results.totalTR.toFixed(2)} TR</Text>
          <Text style={styles.mainResultSubtitle}>Daily Energy: {(results.finalLoad * 24).toFixed(1)} kWh</Text>
          <Text style={styles.mainResultSubtitle}>Heat Removal: {results.totalBTU.toFixed(0)} BTU/hr</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 SUMMARY</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Cooling Capacity:</Text>
              <Text style={styles.summaryValue}>{results.finalLoad.toFixed(2)} kW</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Refrigeration Capacity:</Text>
              <Text style={styles.summaryValue}>{results.totalTR.toFixed(2)} TR</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Daily Energy Consumption:</Text>
              <Text style={styles.summaryValue}>{(results.finalLoad * 24).toFixed(1)} kWh</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 DETAILED BREAKDOWN</Text>
          
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>TRANSMISSION LOADS</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Walls:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.transmission.walls.toFixed(3)} kW</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Ceiling:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.transmission.ceiling.toFixed(3)} kW</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Floor:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.transmission.floor.toFixed(3)} kW</Text>
            </View>
            <View style={[styles.breakdownRow, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>└─ Subtotal:</Text>
              <Text style={styles.subtotalValue}>{results.breakdown.transmission.total.toFixed(3)} kW</Text>
            </View>
          </View>

          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>PRODUCT LOADS</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Sensible Heat:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.product.toFixed(3)} kW</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>└─ Respiration:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.respiration.toFixed(3)} kW</Text>
            </View>
            <View style={[styles.breakdownRow, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>└─ Subtotal:</Text>
              <Text style={styles.subtotalValue}>{(results.breakdown.product + results.breakdown.respiration).toFixed(3)} kW</Text>
            </View>
          </View>

          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>AIR & INFILTRATION</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Air Change Load:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.airChange.toFixed(3)} kW</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Door Opening:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.doorOpening.toFixed(3)} kW</Text>
            </View>
            <View style={[styles.breakdownRow, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>└─ Subtotal:</Text>
              <Text style={styles.subtotalValue}>{(results.breakdown.airChange + results.breakdown.doorOpening).toFixed(3)} kW</Text>
            </View>
          </View>

          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>INTERNAL LOADS</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Occupancy:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.miscellaneous.occupancy.toFixed(3)} kW</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Lighting:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.miscellaneous.lighting.toFixed(3)} kW</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Equipment:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.miscellaneous.equipment.toFixed(3)} kW</Text>
            </View>
            <View style={[styles.breakdownRow, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>└─ Subtotal:</Text>
              <Text style={styles.subtotalValue}>{results.breakdown.miscellaneous.total.toFixed(3)} kW</Text>
            </View>
          </View>

          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>HEATER LOADS</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Peripheral Heaters:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.heaters.peripheral.toFixed(3)} kW</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Tray Heaters:</Text>
              <Text style={styles.breakdownValue}>{results.breakdown.heaters.tray.toFixed(3)} kW</Text>
            </View>
            <View style={[styles.breakdownRow, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>└─ Subtotal:</Text>
              <Text style={styles.subtotalValue}>{results.breakdown.heaters.total.toFixed(3)} kW</Text>
            </View>
          </View>

          <View style={styles.finalCard}>
            <Text style={styles.finalTitle}>FINAL CALCULATION</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Total Calculated:</Text>
              <Text style={styles.breakdownValue}>{results.totalBeforeSafety.toFixed(3)} kW</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Safety Factor (10%):</Text>
              <Text style={styles.breakdownValue}>+{results.safetyFactorLoad.toFixed(3)} kW</Text>
            </View>
            <View style={[styles.breakdownRow, styles.finalRow]}>
              <Text style={styles.finalLabel}>└─ REQUIRED CAPACITY:</Text>
              <Text style={styles.finalValue}>{results.finalLoad.toFixed(2)} kW</Text>
            </View>
          </View>

          <View style={styles.conversionsCard}>
            <Text style={styles.conversionsTitle}>CONVERSIONS</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>├─ Refrigeration:</Text>
              <Text style={styles.breakdownValue}>{results.totalTR.toFixed(2)} TR</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>└─ Heat Removal:</Text>
              <Text style={styles.breakdownValue}>{results.totalBTU.toFixed(0)} BTU/hr</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Cold Room Specifications Summary</Text>
            <Text style={styles.infoText}>• Dimensions: {results.dimensions.length}m × {results.dimensions.width}m × {results.dimensions.height}m</Text>
            <Text style={styles.infoText}>• Door size: {results.doorDimensions.width}m × {results.doorDimensions.height}m</Text>
            <Text style={styles.infoText}>• Room volume: {results.volume.toFixed(1)} m³</Text>
            <Text style={styles.infoText}>• Temperature difference: {results.temperatureDifference.toFixed(1)}°C</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Construction Details</Text>
            <Text style={styles.infoText}>• Insulation: {results.construction.type}</Text>
            <Text style={styles.infoText}>• Thickness: {results.construction.thickness}mm</Text>
            <Text style={styles.infoText}>• U-Factor: {results.construction.uFactor.toFixed(3)} W/m²K</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Product Information</Text>
            <Text style={styles.infoText}>• Product: {results.productInfo.type}</Text>
            <Text style={styles.infoText}>• Daily load: {results.productInfo.mass} kg</Text>
            <Text style={styles.infoText}>• Temperature range: {results.productInfo.incomingTemp}°C → {results.productInfo.outgoingTemp}°C</Text>
            <Text style={styles.infoText}>• Storage type: {results.storageCapacity.storageType}</Text>
            <Text style={styles.infoText}>• Pull-down time: {results.pullDownTime} hours</Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  poweredByBanner: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3B82F6',
  },
  poweredByText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  shareButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  shareButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  mainResultCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mainResultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  mainResultValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#60A5FA',
    marginBottom: 8,
  },
  mainResultSubtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  subtotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 8,
    paddingTop: 12,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
    fontFamily: 'monospace',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  subtotalLabel: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  subtotalValue: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '700',
  },
  finalCard: {
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
    marginBottom: 12,
  },
  finalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  finalRow: {
    borderTopWidth: 2,
    borderTopColor: '#3B82F6',
    marginTop: 8,
    paddingTop: 12,
  },
  finalLabel: {
    fontSize: 15,
    color: '#1E3A8A',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  finalValue: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '700',
  },
  conversionsCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  conversionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 4,
  },
});