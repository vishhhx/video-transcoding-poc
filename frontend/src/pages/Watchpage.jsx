import { useEffect, useState } from "react";
import { useParams } from "react-router";
import axiosInstance from "@/utils/AxiosInstance";
import { Skeleton } from "@/components/ui/skeleton";
import VideoPlayer from "../components/mycomponents/VideoPlayer";
import { getCloudFrontPlaylistUrl } from "@/utils/streamUrl";

function Watchpage() {
  const { id } = useParams();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchVideoInfo() {
      setLoading(true);
      setError(null);
      setVideo(null);

      try {
        const response = await axiosInstance.get(`/view/get-video-by-id/${id}`);

        if (!cancelled) {
          setVideo(response.data);
        }
      } catch (err) {
        console.error("Failed to load video details:", err);

        if (!cancelled) {
          setError("Failed to load video details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (id) {
      fetchVideoInfo();
    } else {
      setLoading(false);
      setError("Video ID is missing.");
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  const streamUrl = getCloudFrontPlaylistUrl(video?.transcodedVideoKey);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <Skeleton className="aspect-video w-full rounded-xl" />

        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 text-red-600">{error}</main>
    );
  }

  if (!streamUrl) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 text-red-600">
        The HLS playlist is not available for this video.
      </main>
    );
  }

  const uploader = video?.uploadedBy;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="w-full">
        <VideoPlayer key={id} src={streamUrl} poster={video?.thumbnailKey} />
      </section>

      <section className="flex items-start gap-3 border-b pb-5">
        <img
          src={uploader?.avatar_url || "/fallback-avatar.png"}
          alt={`${uploader?.name || "Uploader"} avatar`}
          className="h-11 w-11 shrink-0 rounded-full object-cover"
        />

        <div className="min-w-0 flex-1">
          <h1 className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
            {video?.title || "Untitled Video"}
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            {uploader?.name || "Unknown uploader"}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {video?.views !== undefined && `${video.views} views`}

            {video?.views !== undefined && video?.createdAt && " · "}

            {video?.createdAt && new Date(video.createdAt).toLocaleDateString()}
          </p>
        </div>
      </section>
    </main>
  );
}

export default Watchpage;
