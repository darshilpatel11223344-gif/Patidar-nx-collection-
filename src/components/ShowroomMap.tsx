import { useCallback, useEffect, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  APILoadingStatus,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation } from 'lucide-react';

interface ShowroomMapProps {
  address: string;
}

interface ResolvedPlace {
  name: string;
  formattedAddress: string;
  location: { lat: number; lng: number };
}

function ShowroomMapCanvas({ address }: { address: string }) {
  const placesLib = useMapsLibrary('places');
  const status = useApiLoadingStatus();
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(true);
  const [resolved, setResolved] = useState<ResolvedPlace | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (!placesLib) return;
    let cancelled = false;

    const resolveShowroom = async () => {
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: address || 'Safal Plaza, Nikol, Ahmedabad, Gujarat, India',
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
          maxResultCount: 1,
        });

        if (cancelled) return;
        const first = places?.[0];
        if (first?.location) {
          setResolved({
            name: first.displayName || 'PATIDAR NX COLLECTION',
            formattedAddress: first.formattedAddress || address,
            location: {
              lat: first.location.lat(),
              lng: first.location.lng(),
            },
          });
        } else {
          setLookupError('Showroom location lookup returned no coordinates.');
        }
      } catch (err) {
        if (cancelled) return;
        const message = String(err);
        if (message.includes('RESOURCE_EXHAUSTED') || message.includes('OVER_QUERY_LIMIT')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setLookupError('Interactive map preview unavailable right now.');
      }
    };

    resolveShowroom();
    return () => {
      cancelled = true;
    };
  }, [placesLib, address]);

  const handleCloseInfo = useCallback(() => setInfoOpen(false), []);

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE || lookupError) {
    return (
      <ShowroomMapFallback
        address={address}
        note={lookupError || 'Unable to load interactive map right now.'}
      />
    );
  }

  if (!resolved) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#151518] text-[#D6C9B6] p-6 text-center">
        <MapPin className="w-6 h-6 text-[#C8A46B] mb-2 animate-pulse" aria-hidden="true" />
        <p className="text-sm">Locating Safal Plaza, Nikol, Ahmedabad...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapId="DEMO_MAP_ID"
      defaultCenter={resolved.location}
      center={resolved.location}
      defaultZoom={16}
      gestureHandling="cooperative"
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      style={{ width: '100%', height: '100%' }}
    >
      <AdvancedMarker
        ref={markerRef}
        position={resolved.location}
        title="PATIDAR NX COLLECTION — Safal Plaza, Nikol"
        onClick={() => setInfoOpen(true)}
      >
        <Pin
          background="#C8A46B"
          borderColor="#FAF7F0"
          glyphColor="#0E0E10"
          scale={1.25}
        />
      </AdvancedMarker>

      {infoOpen && marker && (
        <InfoWindow anchor={marker} maxWidth={260} onCloseClick={handleCloseInfo}>
          <div className="text-[#141413] p-1">
            <p className="font-semibold text-sm">PATIDAR NX COLLECTION</p>
            <p className="text-xs text-[#4A4945] mt-1 leading-relaxed">
              Safal Plaza, Shops 1 to 6, Nikol, Ahmedabad, Gujarat
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                'Safal Plaza Nikol Ahmedabad Gujarat India'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs font-semibold text-[#8A6830] underline"
            >
              Get Directions
            </a>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

function ShowroomMapFallback({ address, note }: { address: string; note?: string }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    'Safal Plaza, Nikol, Ahmedabad, Gujarat, India'
  )}`;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#151518] border border-[#2A2927] p-8 text-center">
      <div className="w-12 h-12 rounded-full border border-[#C8A46B]/40 flex items-center justify-center mb-4">
        <MapPin className="w-5 h-5 text-[#C8A46B]" aria-hidden="true" />
      </div>
      <h4 className="font-display text-2xl text-[#FAF7F0] mb-2">
        Safal Plaza, Shops 1 to 6
      </h4>
      <p className="text-sm text-[#D6C9B6] max-w-sm leading-relaxed mb-2">{address}</p>
      {note && <p className="text-xs text-[#9C9488] mb-5">{note}</p>}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C8A46B] text-[#0E0E10] text-xs font-semibold tracking-wider uppercase hover:bg-[#DFC391] transition-colors"
      >
        <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
        Open in Google Maps
      </a>
    </div>
  );
}

export function ShowroomMap({ address }: ShowroomMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  if (!apiKey || apiKey === 'MY_GOOGLE_MAPS_API_KEY') {
    return (
      <div className="w-full h-[380px] md:h-[430px] overflow-hidden border border-[#2A2927]">
        <ShowroomMapFallback address={address} />
      </div>
    );
  }

  return (
    <div className="w-full h-[380px] md:h-[430px] overflow-hidden border border-[#2A2927] bg-[#151518]">
      <APIProvider apiKey={apiKey} libraries={['places', 'marker']} language="en" region="IN">
        <ShowroomMapCanvas address={address} />
      </APIProvider>
    </div>
  );
}
