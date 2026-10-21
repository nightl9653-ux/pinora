"use client";

import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";

export type Marker = { lat: number; lng: number; kind: "you" | "answer" };
export type Arc = { startLat: number; startLng: number; endLat: number; endLng: number };

type Props = {
  interactive: boolean;
  rotate: boolean;
  markers: Marker[];
  arcs: Arc[];
  focus: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
};

function clampSize(w: number, h: number) {
  return {
    w: Math.max(240, Math.floor(w)),
    h: Math.max(320, Math.floor(h)),
  };
}

export function GlobeView({ interactive, rotate, markers, arcs, focus, onPick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const moved = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 360, h: 640 });
  const [ready, setReady] = useState(false);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let frame = 0;
    const apply = () => {
      frame = 0;
      setSize(clampSize(el.clientWidth, el.clientHeight));
    };
    const watch = new ResizeObserver(() => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    });
    watch.observe(el);
    apply();
    return () => {
      watch.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.enableDamping = true;
    controls.autoRotate = rotate && !reduced.current;
    controls.autoRotateSpeed = 0.35;
  }, [rotate, ready]);

  useEffect(() => {
    if (!ready || !focus || reduced.current) return;
    globeRef.current?.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: 1.55 }, 900);
  }, [focus, ready]);

  useEffect(() => {
    return () => {
      try {
        globeRef.current?.pauseAnimation();
      } catch {
        /* globe already gone */
      }
    };
  }, []);

  return (
    <div
      className="globe"
      ref={box}
      onPointerDown={(event) => {
        moved.current = false;
        origin.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        const dx = event.clientX - origin.current.x;
        const dy = event.clientY - origin.current.y;
        // Touch / trackpad jitter often exceeds 6px; treat only clearer drags as moves.
        if (dx * dx + dy * dy > 196) moved.current = true;
      }}
    >
      {size.w > 0 && size.h > 0 && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/earth.jpg"
          atmosphereColor="#9ec0db"
          atmosphereAltitude={0.16}
          rendererConfig={{ antialias: false, powerPreference: "high-performance", alpha: true }}
          onGlobeReady={() => {
            setReady(true);
            globeRef.current?.pointOfView({ lat: 18, lng: 12, altitude: 2.35 }, 0);
          }}
          onGlobeClick={(coords) => {
            if (!interactive || moved.current) return;
            onPick(coords.lat, coords.lng);
          }}
          pointsData={markers}
          pointLat="lat"
          pointLng="lng"
          pointColor={(item) => ((item as Marker).kind === "answer" ? "#f2c14e" : "#f4efe4")}
          pointAltitude={0.012}
          pointRadius={0.38}
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={() => ["#f4efe4", "#f2c14e"]}
          arcAltitudeAutoScale={0.4}
          arcStroke={0.55}
        />
      )}
    </div>
  );
}
