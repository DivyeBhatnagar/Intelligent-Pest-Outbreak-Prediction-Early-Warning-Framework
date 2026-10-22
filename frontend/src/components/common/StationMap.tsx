import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { STATIONS, RISK_COLORS } from '../../constants/agroData';
import { RiskLevel } from '../../types/dashboard';

interface StationMapProps {
  selectedLocation?: string;
  onSelectStation?: (stationName: string) => void;
  stationRiskMap?: Record<string, { risk_level: RiskLevel; risk_score: number; pest_name?: string }>;
  height?: string;
}

// Controller to smoothly pan map when selected location changes
const MapController: React.FC<{ selectedLocation?: string }> = ({ selectedLocation }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedLocation && STATIONS[selectedLocation]) {
      const st = STATIONS[selectedLocation];
      map.flyTo([st.lat, st.lon], 7, { duration: 1.2 });
    }
  }, [selectedLocation, map]);

  return null;
};

export const StationMap: React.FC<StationMapProps> = ({
  selectedLocation,
  onSelectStation,
  stationRiskMap = {},
  height = '420px',
}) => {
  return (
    <div style={{ height, width: '100%' }} className="rounded-xl overflow-hidden border border-white/10 relative z-10">
      <MapContainer
        center={[21.5, 79.0]}
        zoom={5}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapController selectedLocation={selectedLocation} />

        {Object.entries(STATIONS).map(([key, st]) => {
          const riskInfo = stationRiskMap[key] || { risk_level: 'LOW', risk_score: 0.15 };
          const markerColor = RISK_COLORS[riskInfo.risk_level] || RISK_COLORS.LOW;
          const isSelected = selectedLocation === key;

          return (
            <CircleMarker
              key={key}
              center={[st.lat, st.lon]}
              radius={isSelected ? 12 : 9}
              pathOptions={{
                fillColor: markerColor,
                fillOpacity: 0.88,
                color: isSelected ? '#ffffff' : '#000000',
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{
                click: () => {
                  if (onSelectStation) onSelectStation(key);
                },
              }}
            >
              <Popup>
                <div className="p-1 font-sans text-slate-100 min-w-[170px]">
                  <div className="font-bold text-sm text-emerald-400">{key}</div>
                  <div className="text-[11px] text-slate-400 mb-1">{st.name}</div>
                  <hr className="border-slate-700 my-1.5" />
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Risk Tier:</span>
                      <span className="font-semibold uppercase" style={{ color: markerColor }}>
                        {riskInfo.risk_level}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Risk Score:</span>
                      <span className="font-mono font-medium">{(riskInfo.risk_score * 100).toFixed(0)}%</span>
                    </div>
                    {riskInfo.pest_name && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Pest:</span>
                        <span className="text-[11px] truncate max-w-[100px]">{riskInfo.pest_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Primary Crops:</span>
                      <span className="text-[11px]">{st.primary_crops?.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};
