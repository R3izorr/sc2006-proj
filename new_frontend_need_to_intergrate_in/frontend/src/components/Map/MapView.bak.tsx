import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";
import {
  fetchOpportunityGeoJSON,
  fetchHawkerCentresGeoJSON,
  fetchMrtExitsGeoJSON,
  fetchBusStopsGeoJSON,
  apiLogout,
} from "../../services/api";
import ChoroplethLayer from "./ChoroplethLayer";
import HeatMapLayer from "./HeatMapLayer";
import HawkerCentresLayer from "./HawkerCentresLayer";
import MrtExitsLayer from "./MrtExitsLayer";
import BusStopsLayer from "./BusStopsLayer";
import Toolbar from "./Toolbar";
import {
  buildNameIndex,
  getSubzoneName,
  getPlanningAreaName,
  topQuantile,
} from "../../utils/geo";

// ...existing code...
