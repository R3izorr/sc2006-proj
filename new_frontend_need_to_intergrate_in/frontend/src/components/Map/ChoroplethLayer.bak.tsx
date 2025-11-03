import React from "react";
import { GeoJSON } from "react-leaflet";
import type { PathOptions } from "leaflet";
import type { Feature, Geometry } from "geojson";

// Border-only rendering: no fill color, just stroke

type Props = {
  data: any;
  selectedId?: string | null;
  onSelect?: (feature: any) => void;
};

export default function ChoroplethLayer({ data, selectedId, onSelect }: Props) {
  // Keep an internal selection when uncontrolled. If `selectedId` is provided, treat as controlled.
  const [internalSelectedId, setInternalSelectedId] = React.useState<
    string | null
  >(null);
  const isControlled = selectedId !== undefined;
  const effectiveSelectedId = isControlled
    ? selectedId ?? null
    : internalSelectedId;

  // Track feature layers by a stable feature id so we can restyle them imperatively
  const layersRef = React.useRef<Map<string, any>>(new Map());
  const selectedRef = React.useRef<string | null>(effectiveSelectedId);
  React.useEffect(() => {
    selectedRef.current = effectiveSelectedId;
  }, [effectiveSelectedId]);

  const baseStyle: PathOptions = {
    weight: 1.2,
    color: "#333",
    fillOpacity: 0,
    lineJoin: "round",
    lineCap: "round",
  };

  const featureId = (feature: any) => {
    const props = feature?.properties ?? {};
    return feature?.id ?? props.SUBZONE_N ?? props.subzone ?? null;
  };

  const style = (feature?: Feature<Geometry>): PathOptions => {
    const id = featureId(feature);
    const selected =
      effectiveSelectedId && id && String(id) === String(effectiveSelectedId);
    return selected
      ? { ...baseStyle, weight: 3, color: "#fd06b3ff", fillOpacity: 0 }
      : baseStyle;
  };

  // Apply styles to all registered layers based on current selection
  const applyStyles = () => {
    layersRef.current.forEach((layer, id) => {
      const isSelected =
        selectedRef.current && String(id) === String(selectedRef.current);
      const s = isSelected
        ? { ...baseStyle, weight: 3, color: "#fd06b3ff", fillOpacity: 0 }
        : baseStyle;
      try {
        layer.setStyle(s);
      } catch {}
    });
  };

  // Re-apply styles when data or selection changes
  React.useEffect(() => {
    applyStyles();
  }, [data, effectiveSelectedId]);

  const onEachFeature = (feature: any, layer: any) => {
    const props = feature?.properties ?? {};
    const name = props.SUBZONE_N ?? props.subzone ?? "Unknown";
    const s = Number(props.H_score ?? props.h_score ?? 0);
    layer.bindTooltip(`${name}<br/>H: ${s.toFixed(3)}`, {
      sticky: true,
      direction: "top",
      opacity: 0.95,
    });

    // Register layer for global styling control
    const id = featureId(feature);
    if (id != null) {
      const key = String(id);
      layersRef.current.set(key, layer);
      layer.on("remove", () => {
        layersRef.current.delete(key);
      });
    }

    layer.on("mouseover", () => {
      const key = id != null ? String(id) : null;
      const isSelected =
        key && selectedRef.current && key === String(selectedRef.current);
      if (!isSelected) {
        layer.setStyle({ weight: 2, color: "#000", fillOpacity: 0 });
      }
      layer.bringToFront();
      layer.openTooltip();
    });
    layer.on("mouseout", () => {
      const key = id != null ? String(id) : null;
      const isSelected =
        key && selectedRef.current && key === String(selectedRef.current);
      if (isSelected) {
        layer.setStyle({
          ...baseStyle,
          weight: 3,
          color: "#fd06b3ff",
          fillOpacity: 0,
        });
      } else {
        layer.setStyle(baseStyle);
      }
      layer.closeTooltip();
    });
    layer.on("click", () => {
      onSelect?.(feature);
      // Update internal selection if uncontrolled and restyle all features
      const key = id != null ? String(id) : null;
      if (!isControlled) {
        setInternalSelectedId(key);
      }
      selectedRef.current = key;
      applyStyles();
    });
  };

  return <GeoJSON data={data} style={style} onEachFeature={onEachFeature} />;
}
