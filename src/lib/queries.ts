"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPlaceById,
  getPlaces,
  getPlacesInBounds,
  getTrendingPlaces,
} from "@/lib/actions/places";
import { getMyTrips, getTripById } from "@/lib/actions/trips";
import {
  getSavedPlaceIds,
  getSavedPlaces,
  toggleSaved,
} from "@/lib/actions/saved";
import { getMyJournal } from "@/lib/actions/journal";
import { getMyProfile } from "@/lib/actions/profile";
import { getFestivals, getUpcomingFestivals } from "@/lib/actions/festivals";
import type { MapBounds, PlaceFilters } from "@/types/database";

// Centralised React Query keys so hooks and manual invalidations stay in sync.
export const queryKeys = {
  places: (filters: PlaceFilters = {}) => ["places", filters] as const,
  placesInBounds: (bounds: MapBounds | null) =>
    ["places", "bounds", bounds] as const,
  place: (id: string) => ["place", id] as const,
  trending: (limit: number) => ["places", "trending", limit] as const,
  myTrips: () => ["trips", "mine"] as const,
  trip: (id: string) => ["trip", id] as const,
  saved: () => ["saved"] as const,
  savedIds: () => ["saved", "ids"] as const,
  journal: () => ["journal"] as const,
  profile: () => ["profile"] as const,
  festivals: () => ["festivals"] as const,
  upcomingFestivals: (limit: number) =>
    ["festivals", "upcoming", limit] as const,
};

export function usePlaces(filters: PlaceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.places(filters),
    queryFn: () => getPlaces(filters),
  });
}

export function usePlacesInBounds(bounds: MapBounds | null) {
  return useQuery({
    queryKey: queryKeys.placesInBounds(bounds),
    queryFn: () => getPlacesInBounds(bounds as MapBounds),
    enabled: bounds != null,
  });
}

export function usePlace(id: string) {
  return useQuery({
    queryKey: queryKeys.place(id),
    queryFn: () => getPlaceById(id),
    enabled: Boolean(id),
  });
}

export function useTrendingPlaces(limit = 8) {
  return useQuery({
    queryKey: queryKeys.trending(limit),
    queryFn: () => getTrendingPlaces({ limit }),
  });
}

export function useMyTrips() {
  return useQuery({ queryKey: queryKeys.myTrips(), queryFn: getMyTrips });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: queryKeys.trip(id),
    queryFn: () => getTripById(id),
    enabled: Boolean(id),
  });
}

export function useSavedPlaces() {
  return useQuery({ queryKey: queryKeys.saved(), queryFn: getSavedPlaces });
}

export function useSavedPlaceIds() {
  return useQuery({ queryKey: queryKeys.savedIds(), queryFn: getSavedPlaceIds });
}

export function useMyJournal() {
  return useQuery({ queryKey: queryKeys.journal(), queryFn: getMyJournal });
}

export function useMyProfile() {
  return useQuery({ queryKey: queryKeys.profile(), queryFn: getMyProfile });
}

export function useFestivals() {
  return useQuery({ queryKey: queryKeys.festivals(), queryFn: getFestivals });
}

export function useUpcomingFestivals(limit = 6) {
  return useQuery({
    queryKey: queryKeys.upcomingFestivals(limit),
    queryFn: () => getUpcomingFestivals(limit),
  });
}

export function useToggleSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (placeId: string) => toggleSaved(placeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.saved() });
      qc.invalidateQueries({ queryKey: queryKeys.savedIds() });
    },
  });
}
