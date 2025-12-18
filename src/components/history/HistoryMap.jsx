import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin } from 'lucide-react';
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet icon not finding images
const customIcon = new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

export default function HistoryMap({ events, onEventSelect, dateRange }) {
    // Filter events that have location data and fall within date range
    const mappableEvents = useMemo(() => {
        return events.filter(event => {
            const hasLocation = event.location && event.location.lat && event.location.lng;
            
            // Parse year logic matching HistoryPage
            const eventYearMatch = event.year.match(/(\d{4})/);
            const eventYear = eventYearMatch ? parseInt(eventYearMatch[1]) : 0;
            const inDateRange = eventYear >= dateRange[0] && eventYear <= dateRange[1];
            
            return hasLocation && inDateRange;
        });
    }, [events, dateRange]);

    const center = [32.9365, -93.2921]; // Default center (Union Springs)

    return (
        <Card className="h-[600px] w-full border-none shadow-none bg-transparent">
            <CardContent className="p-0 h-full rounded-xl overflow-hidden border border-stone-300 relative">
                <MapContainer 
                    center={center} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {mappableEvents.map((event) => (
                        <Marker 
                            key={event.id} 
                            position={[event.location.lat, event.location.lng]}
                            icon={customIcon}
                            eventHandlers={{
                                click: () => onEventSelect && onEventSelect(event.id),
                            }}
                        >
                            <Popup className="font-sans">
                                <div className="p-1 max-w-[200px]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] px-1.5 h-5">
                                            {event.year}
                                        </Badge>
                                    </div>
                                    <h3 className="font-bold text-sm text-stone-900 leading-tight mb-1">
                                        {event.title}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-stone-500 mb-2">
                                        <MapPin className="w-3 h-3" />
                                        {event.location.label}
                                    </div>
                                    <p className="text-xs text-stone-600 line-clamp-3">
                                        {event.text.replace(/NOTE \d+/g, '')}
                                    </p>
                                    {onEventSelect && (
                                        <Button 
                                            size="sm" 
                                            variant="link" 
                                            className="px-0 h-auto text-xs text-teal-600 mt-2"
                                            onClick={() => onEventSelect(event.id)}
                                        >
                                            View Details
                                        </Button>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
                
                {/* Map Overlay Legend/Info */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md border border-stone-200 max-w-xs z-[1000]">
                    <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Historical Sites
                    </h4>
                    <p className="text-xs text-stone-500">
                        Showing {mappableEvents.length} historical locations from {dateRange[0]} to {dateRange[1]}.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}