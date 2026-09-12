import { useEffect, useRef, useState } from "react";
import { mountPrototypeRenderer } from "./game/mount-prototype-renderer.js";

export function App() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [rendererStatus, setRendererStatus] = useState("Checking WebGL 2…");

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const result = mountPrototypeRenderer(viewport);

    if (!result.ok) {
      setRendererStatus(result.reason);
      return;
    }

    setRendererStatus("WebGL 2 ready · orthographic greybox");
    return result.dispose;
  }, []);

  return (
    <main className="prototype-shell">
      <div className="viewport" ref={viewportRef} aria-label="Prototype 3D world viewport" />
      <section className="hud" aria-live="polite">
        <p className="eyebrow">ARCHITECTURE SPIKE</p>
        <h1>The Unfinished Earth</h1>
        <p>{rendererStatus}</p>
        <p className="muted">
          Target slice: building → water/road → food → NPC decision → Chronicle
        </p>
      </section>
    </main>
  );
}
