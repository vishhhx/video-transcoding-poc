import React, { useEffect, useState } from "react";
import ViewCard from "../components/mycomponents/ViewCard";
import axiosInstance from "@/utils/AxiosInstance";

function Videos() {
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  const fetchVideos = async (pageNum) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/view/get-all-videos?limit=${limit}&page=${pageNum}`
      );
      const data = response.data;
      if (response.status === 200) {
        setVideos((prevVideos) => [...prevVideos, ...data.videos]);
        setHasMore(data.hasMore);
      } else {
        setError(data.message || "Failed to fetch videos");
      }
    } catch (error) {
      setError("An error occurred while fetching videos");
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(page);
  }, [page]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 100 &&
        hasMore &&
        !loading
      ) {
        setPage((prevPage) => prevPage + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {videos.map((video) => (
          <ViewCard key={video._id} video={video} />
        ))}
      </div>
      {loading && <p className="text-center py-4">Loading more videos...</p>}
      {error && <p className="text-red-500 text-center">{error}</p>}
    </div>
  );
}

export default Videos;
