import axiosInstance from "@/utils/AxiosInstance";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import VideoPlayer from "../components/mycomponents/VideoPlayer";
import { Skeleton } from "@/components/ui/skeleton";

function Watchpage() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideoInfo = async () => {
      try {
        const response = await axiosInstance.get(`/view/get-video-by-id/${id}`);
        setVideo(response.data);
        console.log("Video data:", response.data);
      } catch (err) {
        setError("Failed to load video details.");
        console.error("Error fetching video info:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideoInfo();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="w-full h-[500px] rounded-md" />
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-full" />
          <div className="space-y-2 w-full">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-left py-4 px-6">{error}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-4 gap-6">
      <div className="w-full max-w-[1350px] ">
        <VideoPlayer
          poster={video?.thumbnailKey}
          src={video?.transcodedVideoKey}
        />
      </div>

      <div className="flex items-start gap-4">
        <img
          src={video?.uploadedBy?.avatar_url || "/fallback-avatar.png"}
          alt={`Avatar of ${video?.uploadedBy?.name || "Uploader"}`}
          className="w-11 h-11 rounded-full object-cover"
        />

        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-xl md:text-2xl text-gray-900">
            {video?.title || "Untitled Video"}
          </h2>
          <p className="text-sm text-gray-700">
            {video?.uploadedBy?.name || "Unknown Uploader"}
          </p>
          {video?.views !== undefined && (
            <p className="text-xs text-muted-foreground">
              {video.views} views ·{" "}
              {video.createdAt &&
                new Date(video.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Watchpage;
