import videojs from "video.js";
import "video.js/dist/video-js.css";
import { useCallback, useEffect, useRef, useState } from "react";

const VideoPlayer = ({ src, poster, onRetry }) => {
  const videoElementRef = useRef(null);
  const playerRef = useRef(null);
  const representationsRef = useRef([]);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [qualities, setQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState("auto");

  useEffect(() => {
    const element = videoElementRef.current;

    if (!element || !src) return undefined;

    let disposed = false;
    let qualityPollId;

    setIsReady(false);
    setError(null);
    setQualities([]);
    setSelectedQuality("auto");
    representationsRef.current = [];

    const player = videojs(element, {
      controls: true,
      autoplay: false,
      preload: "metadata",
      responsive: true,
      fluid: false,
      aspectRatio: "16:9",
      poster: poster || undefined,
      playsinline: true,
      html5: {
        vhs: {
          withCredentials: false,
        },
      },
      sources: [
        {
          src,
          type: "application/x-mpegURL",
        },
      ],
    });

    playerRef.current = player;

    const updateQualities = () => {
      if (disposed || player.isDisposed()) return;

      try {
        const tech = player.tech({
          IWillNotUseThisInPlugins: true,
        });

        const vhs = tech?.vhs;
        const reps = vhs?.representations?.();

        if (!reps?.length) return;

        const uniqueQualities = new Map();

        for (const representation of reps) {
          const height = representation.height;

          if (!height) continue;

          if (!uniqueQualities.has(height)) {
            uniqueQualities.set(height, {
              height,
              representations: [],
            });
          }

          uniqueQualities.get(height).representations.push(representation);
        }

        const available = [...uniqueQualities.values()].sort(
          (a, b) => b.height - a.height,
        );

        representationsRef.current = reps;
        setQualities(available);
      } catch (err) {
        console.warn("Could not read HLS quality levels:", err);
      }
    };

    player.on("loadedmetadata", () => {
      if (disposed) return;

      setIsReady(true);
      setError(null);
      updateQualities();
    });

    player.on("loadeddata", () => {
      if (!disposed) setIsReady(true);
    });

    player.on("canplay", () => {
      if (!disposed) setIsReady(true);
    });

    player.on("error", () => {
      if (disposed) return;

      const playerError = player.error();

      console.error("Video.js playback error:", {
        code: playerError?.code,
        message: playerError?.message,
        source: player.currentSrc(),
      });

      setError(playerError?.message || "Unable to load this video.");
    });

    // VHS may expose renditions only after parsing the master playlist.
    qualityPollId = setInterval(updateQualities, 500);

    player.ready(() => {
      if (disposed) return;
      updateQualities();
    });

    return () => {
      disposed = true;
      clearInterval(qualityPollId);

      if (playerRef.current === player) {
        playerRef.current = null;
      }

      representationsRef.current = [];

      if (!player.isDisposed()) {
        player.dispose();
      }
    };
  }, [src, poster, retryKey]);

  const handleQualityChange = useCallback((value) => {
    setSelectedQuality(value);

    const representations = representationsRef.current;

    for (const representation of representations) {
      const enabled =
        value === "auto" || String(representation.height) === value;

      representation.enabled(enabled);
    }
  }, []);

  const handleRetry = useCallback(async () => {
    setError(null);
    setIsReady(false);

    try {
      await onRetry?.();
      setRetryKey((key) => key + 1);
    } catch (err) {
      console.error("Video retry failed:", err);
      setError("Retry failed. Please try again.");
    }
  }, [onRetry]);

  return (
    <div className="w-full overflow-hidden rounded-xl bg-black shadow-xl">
      <div className="relative aspect-video w-full">
        {src ? (
          <video
            ref={videoElementRef}
            className="video-js vjs-big-play-centered !absolute !inset-0 !h-full !w-full"
            playsInline
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white">
            No video source available.
          </div>
        )}

        {qualities.length > 0 && !error && (
          <div className="absolute right-3 top-3 z-30">
            <label className="sr-only" htmlFor="video-quality">
              Video quality
            </label>

            <select
              id="video-quality"
              value={selectedQuality}
              onChange={(event) => handleQualityChange(event.target.value)}
              className="rounded-lg border border-white/20 bg-black/80 px-3 py-2 text-sm text-white shadow-lg outline-none focus:ring-2 focus:ring-white/70"
            >
              <option value="auto">Auto</option>

              {qualities.map(({ height }) => (
                <option key={height} value={String(height)}>
                  {height}p
                </option>
              ))}
            </select>
          </div>
        )}

        {!error && src && !isReady && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/30">
            <div className="flex items-center gap-3 rounded-lg bg-black/70 px-4 py-3 text-sm text-white">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Loading video...
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white">
            <p className="text-lg font-semibold">Unable to play this video</p>

            <p className="max-w-md text-sm text-white/70">{error}</p>

            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-gray-200"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
