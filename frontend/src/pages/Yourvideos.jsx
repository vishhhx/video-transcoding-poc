import React, { useEffect, useState } from "react";
import axiosInstance from "@/utils/AxiosInstance";
import OwnerVideoCard from "@/components/mycomponents/OwnerVideoCard";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

function YourVideos() {
  const [completedVideos, setCompletedVideos] = useState([]);
  const [incompleteVideos, setIncompleteVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/view/getall-videos-by-user");
      setCompletedVideos(response.data.completedVideos || []);
      setIncompleteVideos(response.data.incompleteVideos || []);
    } catch (err) {
      setError(err);
      toast.error("Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 h-screen overflow-y-auto">
        <Skeleton className="h-6 w-48" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-36" />
            <div className="flex space-x-4 overflow-x-auto">
              {[...Array(3)].map((__, j) => (
                <Skeleton key={j} className="h-64 w-80 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 font-semibold">
        Error fetching videos: {error.message}
      </div>
    );
  }

  return (
    <div className="p-13 h-screen  space-y-12">
      {/* Incomplete Videos */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Incomplete</h2>
        {incompleteVideos.length === 0 ? (
          <p className="text-muted-foreground">
            No incomplete videos available.
          </p>
        ) : (
          <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent className="-ml-4">
              {incompleteVideos.map((video) => (
                <CarouselItem
                  key={video._id}
                  className="pl-4 basis-auto sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                >
                  <OwnerVideoCard video={video} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        )}
      </section>

      {/* Complete Videos */}
      <section className="space-y-4 pb-5">
        <h2 className="text-xl font-bold tracking-tight">Complete</h2>
        {completedVideos.length === 0 ? (
          <p className="text-muted-foreground">No completed videos yet.</p>
        ) : (
          <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent className="-ml-4">
              {completedVideos.map((video) => (
                <CarouselItem
                  key={video._id}
                  className="pl-4 basis-auto sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                >
                  <OwnerVideoCard video={video} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        )}
      </section>
    </div>
  );
}

export default YourVideos;
