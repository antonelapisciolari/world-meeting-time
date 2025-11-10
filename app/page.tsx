"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";

interface CityInfo {
  name: string;
  offset: number;
  zone: string;
}

interface LocalSlot {
  city: string;
  start: string;
  end: string;
}

interface ZoneGroup {
  [continent: string]: string[];
}

export default function Home() {
  const apiKey = "OCABQ5F4LZBF"; // 👈 tu clave real

  const [zonesByContinent, setZonesByContinent] = useState<ZoneGroup>({});
  const [baseCity, setBaseCity] = useState("");
  const [otherCities, setOtherCities] = useState<string[]>([]);
  const [selectedContinent, setSelectedContinent] = useState("");
  const [overlapSlots, setOverlapSlots] = useState<LocalSlot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cachedZones = useRef<any[] | null>(null);

  const recommendedCities = [
    "Madrid",
    "New York",
    "Buenos Aires",
    "São Paulo",
    "Tokyo",
    "London",
    "Sydney",
    "Paris",
  ];

  // 🧠 🔹 SETEAR EL TÍTULO DEL TAB
  useEffect(() => {
    document.title = "🌍 World Meeting Time – Coordiná horarios internacionales";
  }, []);

  // --- 1️⃣ Cargar zonas horarias una sola vez ---
  useEffect(() => {
    const loadZones = async () => {
      try {
        const res = await fetch(
          `https://api.timezonedb.com/v2.1/list-time-zone?key=${apiKey}&format=json`
        );
        const data = await res.json();
        cachedZones.current = data.zones;

        const grouped: ZoneGroup = {};
        data.zones.forEach((z: any) => {
          const [continent] = z.zoneName.split("/");
          if (!grouped[continent]) grouped[continent] = [];
          grouped[continent].push(z.zoneName);
        });

        Object.keys(grouped).forEach((key) =>
          grouped[key].sort((a, b) => a.localeCompare(b))
        );

        setZonesByContinent(grouped);
      } catch (err) {
        console.error(err);
      }
    };
    loadZones();
  }, []);

  // --- 2️⃣ Buscar ciudad ---
  const getCity = (name: string): CityInfo | null => {
    const allZones = cachedZones.current || [];
    const match = allZones.find((z: any) =>
      z.zoneName.toLowerCase().includes(name.toLowerCase())
    );
    if (!match) return null;
    return {
      name: name.split("/")[1] || name,
      offset: match.gmtOffset,
      zone: match.zoneName,
    };
  };

  // --- 3️⃣ Calcular solapamiento ---
  const calculateLocalOverlaps = (
    base: CityInfo,
    others: CityInfo[]
  ): LocalSlot[] | null => {
    const allCities = [base, ...others];
    const allRanges = allCities.map((c) => ({
      city: c.name,
      startUTC: 8 * 3600 - c.offset,
      endUTC: 18 * 3600 - c.offset,
    }));

    const maxStart = Math.max(...allRanges.map((r) => r.startUTC));
    const minEnd = Math.min(...allRanges.map((r) => r.endUTC));
    if (maxStart >= minEnd) return null;

    const fmt = (h: number) =>
      `${Math.floor(h).toString().padStart(2, "0")}:00`;

    return allCities.map((c) => {
      const startLocal = ((maxStart + c.offset) / 3600 + 24) % 24;
      const endLocal = ((minEnd + c.offset) / 3600 + 24) % 24;
      return { city: c.name, start: fmt(startLocal), end: fmt(endLocal) };
    });
  };

  // --- 4️⃣ Calcular overlap ---
  const handleCalculate = async () => {
    if (!baseCity) {
      setError("Debes seleccionar una ciudad principal.");
      setOverlapSlots(null);
      return;
    }

    setError(null);
    setOverlapSlots(null);
    setLoading(true);

    try {
      const base = getCity(baseCity);
      if (!base) {
        setError("Please select a valid city.");
        setLoading(false);
        return;
      }

      const filteredOthers = otherCities.filter((c) => c !== baseCity);
      const others = filteredOthers
        .map((c) => getCity(c))
        .filter((x): x is CityInfo => x !== null);

      if (others.length === 0) {
        setError("Please add at least one other city.");
        setLoading(false);
        return;
      }

      const overlap = calculateLocalOverlaps(base, others);
      if (!overlap) {
        setError("No overlap in working hours (08–18).");
        setLoading(false);
        return;
      }

      setOverlapSlots(overlap);
    } catch (err) {
      console.error(err);
      setError("Error calculating overlap.");
    } finally {
      setLoading(false);
    }
  };

  // --- 5️⃣ Agregar / eliminar ---
  const handleAddCity = (city: string) => {
    if (city && !otherCities.includes(city)) {
      setOtherCities((prev) => [...prev, city]);
    }
  };

  const handleRemoveCity = (city: string) => {
    setOtherCities((prev) => prev.filter((c) => c !== city));
  };

  const handleClearAll = () => {
    setBaseCity("");
    setSelectedContinent("");
    setOtherCities([]);
    setOverlapSlots(null);
    setError(null);
  };

  const continentCities = selectedContinent
    ? zonesByContinent[selectedContinent] || []
    : [];

  useEffect(() => {
    if (!baseCity || otherCities.length === 0) {
      setOverlapSlots(null);
    }
  }, [baseCity, otherCities]);

  // --- UI ---
  return (
    <main className="flex flex-col items-center min-h-screen p-8 bg-gray-50 text-gray-800">
      <h1 className="text-4xl font-bold mb-2">🌍 Meeting Time Finder</h1>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        Find overlapping working hours between cities (08:00–18:00)
      </p>

      {/* --- Ciudades recomendadas --- */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {recommendedCities.map((city) => (
          <button
            key={city}
            onClick={() => {
              const allZones = cachedZones.current || [];
              const match = allZones.find((z: any) =>
                z.zoneName
                  .toLowerCase()
                  .includes(city.toLowerCase().replace(/\s+/g, "_"))
              );
              if (match) {
                setBaseCity(match.zoneName);
                if (!otherCities.includes(match.zoneName)) {
                  handleAddCity(match.zoneName);
                }
              } else {
                setError(`No se encontró la zona horaria para ${city}`);
              }
            }}
            className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-800 hover:bg-blue-50 hover:border-blue-400 transition-colors"
          >
            {city}
          </button>
        ))}
      </div>

      {/* --- Your city --- */}
      <div className="w-full max-w-md mb-4">
        <label className="block mb-1 font-medium text-gray-700">
          Your city:
        </label>
        <select
          value={baseCity}
          onChange={(e) => {
            const selected = e.target.value;
            setBaseCity(selected);
            if (selected && !otherCities.includes(selected)) {
              handleAddCity(selected);
            }
          }}
          className="w-full p-2 border border-gray-300 rounded bg-white text-gray-800 max-h-60 overflow-y-auto"
        >
          <option value="">Select your city</option>
          {Object.values(zonesByContinent)
            .flat()
            .map((city) => (
              <option key={city} value={city}>
                {city.replace("_", " ")}
              </option>
            ))}
        </select>
      </div>

      {/* --- Region y otras ciudades --- */}
      <div className="w-full max-w-md mb-4">
        <label className="block mb-1 font-medium text-gray-700">
          Region:
        </label>
        <select
          value={selectedContinent}
          onChange={(e) => setSelectedContinent(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded bg-white text-gray-800 mb-2"
        >
          <option value="">Select a region</option>
          {Object.keys(zonesByContinent).map((continent) => (
            <option key={continent} value={continent}>
              {continent}
            </option>
          ))}
        </select>

        {selectedContinent === "" && (
          <p className="text-red-600 text-sm mb-1">
            Please choose a region.
          </p>
        )}

        {continentCities.length > 0 && (
          <select
            onChange={(e) => handleAddCity(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded bg-white text-gray-800"
          >
            <option value="">Select a city</option>
            {continentCities.map((city) => (
              <option key={city} value={city}>
                {city.replace("_", " ")}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* --- Lista de ciudades seleccionadas --- */}
      {otherCities.length > 0 && (
        <div className="flex flex-wrap gap-2 max-w-md mb-4">
          {otherCities.map((city) => (
            <div
              key={city}
              className={`flex items-center ${
                city === baseCity
                  ? "bg-yellow-100 border-yellow-400"
                  : "bg-blue-50 border-blue-300"
              } border px-3 py-1 rounded-full text-sm text-gray-800`}
            >
              {city.replace("_", " ")}
              <button
                onClick={() => handleRemoveCity(city)}
                className="ml-2 text-blue-700 hover:text-red-500 font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- Botones principales --- */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? "Calculating..." : "Find Overlap"}
        </button>

        <button
          onClick={handleClearAll}
          className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300 transition-colors"
        >
          Clear
        </button>
      </div>

      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      {/* --- Resultados --- */}
      {overlapSlots && (
        <div className="w-full max-w-md bg-white border shadow-sm rounded p-4 text-gray-800">
          <h2 className="text-lg font-semibold mb-3 text-center text-blue-700">
            ⏰ Common Working Hours (Local Times)
          </h2>
          {overlapSlots.map((s, i) => (
            <div
              key={i}
              className="flex justify-between border-b border-gray-200 py-2 last:border-0"
            >
              <span className="font-medium">{s.city}</span>
              <span className="text-blue-600">
                {s.start} → {s.end}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
