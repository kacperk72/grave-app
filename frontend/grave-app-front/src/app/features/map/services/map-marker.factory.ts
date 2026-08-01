import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({ providedIn: 'root' })
export class MapMarkerFactory {
  userPin(): L.DivIcon {
    return L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="marker-pin">
          <svg width="30" height="40" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z"
                  fill="#10b981" stroke="#047857" stroke-width="2"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
            <circle cx="16" cy="16" r="3" fill="#10b981"/>
          </svg>
        </div>
      `,
      iconSize: [30, 40],
      iconAnchor: [15, 40],
    });
  }

  userArrow(rotationDeg: number): L.DivIcon {
    return L.divIcon({
      className: 'user-location-arrow-marker',
      html: `
        <div class="user-direction-arrow" style="transform: rotate(${rotationDeg}deg);">
          <svg width="36" height="36" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 3 L27 15 L15 27 L15 20 L5 20 L5 10 L15 10 Z"
                  fill="#10b981" stroke="white" stroke-width="2"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }

  grave(): L.DivIcon {
    return L.divIcon({
      html: `
        <svg width="28" height="38" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z"
                fill="#6366f1" stroke="#4338ca" stroke-width="2"/>
          <path d="M16 10 L16 22 M10 16 L22 16" stroke="white" stroke-width="3" stroke-linecap="round"/>
        </svg>
      `,
      iconSize: [28, 38],
      iconAnchor: [14, 38],
      className: 'grave-marker',
    });
  }

  routeNumber(index: number): L.DivIcon {
    return L.divIcon({
      html: `<div class="route-bullet">${index + 1}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      className: 'route-number-marker',
    });
  }

  cluster(count: number): L.DivIcon {
    return L.divIcon({
      html: `<div class="cluster-bubble">${count}</div>`,
      className: 'grave-cluster',
      iconSize: L.point(40, 40, true),
    });
  }
}
