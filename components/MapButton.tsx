"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X, Check } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Reusable "pick from map" control. Writes the chosen coordinates back into the
// nearest form inputs named `latName` / `lngName` (which stay plain text/number
// inputs, so form submission is unaffected).
export function MapButton({
  latName,
  lngName,
  label = "اختر من الخريطة",
}: {
  latName: string;
  lngName: string;
  label?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  function readForm(): { lat: number; lng: number } | null {
    const form = btnRef.current?.closest("form");
    if (!form) return null;
    const lat = parseFloat((form.querySelector(`[name="${latName}"]`) as HTMLInputElement)?.value);
    const lng = parseFloat((form.querySelector(`[name="${lngName}"]`) as HTMLInputElement)?.value);
    return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const L: any = await import("leaflet");
      if (cancelled || !mapEl.current) return;
      const existing = readForm();
      const start = existing ?? { lat: 32.8872, lng: 13.1913 }; // Tripoli
      const map = L.map(mapEl.current, { attributionControl: false }).setView(
        [start.lat, start.lng],
        existing ? 14 : 6
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "",
        maxZoom: 19,
      }).addTo(map);
      const icon = L.divIcon({
        html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.4))">📍</div>',
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      const marker = L.marker([start.lat, start.lng], { draggable: true, icon }).addTo(map);
      setCoords(start);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setCoords({ lat: p.lat, lng: p.lng });
      });
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapObj.current = map;
      setTimeout(() => map.invalidateSize(), 150);
    })();
    return () => {
      cancelled = true;
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, [open]);

  function confirm() {
    if (coords) {
      const form = btnRef.current?.closest("form");
      const latEl = form?.querySelector(`[name="${latName}"]`) as HTMLInputElement | null;
      const lngEl = form?.querySelector(`[name="${lngName}"]`) as HTMLInputElement | null;
      if (latEl) {
        latEl.value = coords.lat.toFixed(6);
        latEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (lngEl) {
        lngEl.value = coords.lng.toFixed(6);
        lngEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    setOpen(false);
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => setOpen(true)} className="btn-ghost flex items-center gap-1.5">
        <MapPin size={15} /> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-pop" dir="rtl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">تحديد الموقع من الخريطة</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="px-4 py-2 text-xs text-gray-500">انقر على الخريطة أو اسحب العلامة لتحديد الموقع.</div>
            <div ref={mapEl} className="h-[440px] w-full" />
            <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
              <div className="font-mono text-xs text-gray-600" dir="ltr">
                {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "—"}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">إلغاء</button>
                <button type="button" onClick={confirm} className="btn-primary flex items-center gap-1.5">
                  <Check size={15} /> تأكيد الموقع
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
