"use client";

import { useState, useCallback } from "react";
import { LocationMap, MapLocation } from "@/components/LocationMap";
import { useCollection } from "@/lib/api/use-strapi";

type Location = {
  id: number;
  documentId: string;
  name?: string;
  mapData: MapLocation;
};

export default function Home() {
  const {
    data: locations,
    isLoading,
    isError,
    refetch,
  } = useCollection<Location>("locations", {
    sort: "createdAt:desc",
    pagination: { pageSize: 10 },
    populate: "*",
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refetch();
    // Small delay to allow refetch to complete before resetting map
    setTimeout(() => {
      setMapKey((prev) => prev + 1);
      setIsRefreshing(false);
    }, 500);
  }, [refetch]);

  const firstLocation = locations?.[0];

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-black">
        <p className="text-black dark:text-white">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-black">
        <p className="text-red-500">Failed to load locations</p>
      </div>
    );
  }

  if (!firstLocation?.mapData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-black">
        <p className="text-black dark:text-white">No locations found</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <LocationMap
        key={mapKey}
        location={firstLocation.mapData}
        searchable
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Location Info Overlay */}
      <div className="absolute bottom-14 left-4 right-4 z-10 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:bg-black/90">
        <h1 className="truncate text-lg font-semibold text-black dark:text-white">
          {firstLocation.name || "Location"}
        </h1>
        {firstLocation.mapData.address && (
          <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">
            {firstLocation.mapData.address}
          </p>
        )}
      </div>
    </div>
  );
}
