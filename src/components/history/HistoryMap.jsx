import React, { useMemo, useCallback, memo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polygon, Circle, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin } from 'lucide-react';
import "leaflet/dist/leaflet.css";

// Create icon once - avoid recreating on each render
const customIcon = new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Memoized marker component
const EventMarker = memo(function EventMarker({ event, onSelect }) {
    const handleClick = useCallback(() => {
        onSelect?.(event.id);
    }, [onSelect, event.id]);

    return (
        <Marker 
            position={[event.location.lat, event.location.lng]}
            icon={customIcon}
            eventHandlers={{ click: handleClick }}
        >
            <Tooltip 
                direction="top" 
                offset={[0, -20]} 
                opacity={1} 
                className="font-sans rounded-md shadow-md border-none px-3 py-2"
            >
                <div className="text-center">
                    <span className="block font-bold text-sm text-teal-900">{event.title}</span>
                    <span className="block text-xs text-stone-500 font-serif">{event.year}</span>
                    {event.weather && (
                        <div className="flex items-center justify-center gap-1 mt-1 text-xs text-amber-600 font-medium bg-amber-50 px-1 py-0.5 rounded">
                            <span>{event.weather.condition}</span>
                        </div>
                    )}
                    <span className="block text-[10px] text-stone-400 mt-1 uppercase tracking-wide">Click to view on timeline</span>
                </div>
            </Tooltip>
        </Marker>
    );
});

// Memoized overlay components
const EventOverlay = memo(function EventOverlay({ overlay }) {
    if (!overlay) return null;

    if (overlay.type === 'polygon') {
        return (
            <Polygon 
                positions={overlay.positions}
                pathOptions={{ 
                    color: overlay.color, 
                    fillColor: overlay.color, 
                    fillOpacity: 0.2, 
                    weight: 2, 
                    dashArray: '5, 5' 
                }}
            >
                <Popup>{overlay.label}</Popup>
            </Polygon>
        );
    }

    if (overlay.type === 'circle') {
        return (
            <Circle 
                center={overlay.center}
                radius={overlay.radius}
                pathOptions={{ 
                    color: overlay.color, 
                    fillColor: overlay.color, 
                    fillOpacity: 0.2, 
                    weight: 2 
                }}
            >
                <Popup>{overlay.label}</Popup>
            </Circle>
        );
    }

    return null;
});

// Map legend component
const MapLegend = memo(function MapLegend({ count, dateRange }) {
    return (
        <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-white/90 backdrop-blur-sm p-2 md:p-3 rounded-lg shadow-md border border-stone-200 max-w-[140px] md:max-w-xs z-[1000]">
            <h4 className="font-bold text-stone-800 text-[10px] md:text-xs uppercase tracking-wider mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
                <MapPin className="w-3 h-3" aria-hidden="true" /> Sites
            </h4>
            <p className="text-[10px] md:text-xs text-stone-500">
                {count} location{count !== 1 ? 's' : ''} ({dateRange[0]}-{dateRange[1]})
            </p>
        </div>
    );
});

function HistoryMap({ events, onEventSelect, dateRange }) {
    // Filter events with memoization
    const mappableEvents = useMemo(() => {
        if (!events || !Array.isArray(events)) return [];
        return events.filter(event => {
            if (!event.location?.lat || !event.location?.lng) return false;
            
            const eventYearMatch = event.year?.match(/(\d{4})/);
            const eventYear = eventYearMatch ? parseInt(eventYearMatch[1], 10) : 0;
            
            return eventYear >= dateRange[0] && eventYear <= dateRange[1];
        });
    }, [events, dateRange]);

    // Center point for the map
    const center = useMemo(() => [32.9365, -93.2921], []); // Centered on Union Springs Church

    // Handle event selection
    const handleEventSelect = useCallback((id) => {
        onEventSelect?.(id);
    }, [onEventSelect]);

    const eventCount = mappableEvents.length;

    return (
        <div className="h-full w-full relative" style={{ minHeight: '400px' }}>
            <MapContainer 
                center={center} 
                zoom={11} 
                style={{ height: '100%', width: '100%', minHeight: '400px' }}
                scrollWheelZoom={true}
                doubleClickZoom={true}
                zoomControl={true}
                dragging={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={18}
                />
                
                {mappableEvents.map((event) => (
                    <React.Fragment key={event.id}>
                        <EventMarker 
                            event={event} 
                            onSelect={handleEventSelect} 
                        />
                        {event.overlay && <EventOverlay overlay={event.overlay} />}
                    </React.Fragment>
                ))}
            </MapContainer>
            
            <MapLegend count={eventCount} dateRange={dateRange} />
        </div>
    );
}

export default memo(HistoryMap);