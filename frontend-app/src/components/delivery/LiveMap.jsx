import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon paths (required for Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom red dot for the delivery man
const deliveryIcon = new L.DivIcon({
  className: "delivery-marker",
  html: `<div style="
    width: 16px;
    height: 16px;
    background: #ef4444;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Auto-pan the map when the marker moves
function MapAutoPan({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.panTo(position, { animate: true, duration: 1 });
    }
  }, [position, map]);
  return null;
}

export default function LiveMap({ deliveryPosition, buyerPosition, farmerPosition }) {
  const defaultCenter = deliveryPosition || buyerPosition || farmerPosition || [23.8103, 90.4125]; // Dhaka default

  return (
    <div style={{ width: "100%", height: "300px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {deliveryPosition && (
          <>
            <Marker position={deliveryPosition} icon={deliveryIcon}>
              <Popup>Delivery Man Location</Popup>
            </Marker>
            <MapAutoPan position={deliveryPosition} />
          </>
        )}

        {buyerPosition && (
          <Marker position={buyerPosition}>
            <Popup>Delivery Address</Popup>
          </Marker>
        )}

        {farmerPosition && (
          <Marker position={farmerPosition}>
            <Popup>Farm Location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}