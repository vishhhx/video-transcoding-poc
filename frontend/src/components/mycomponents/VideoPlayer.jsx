import ReactPlayer from "react-player";
import { useState, useEffect } from 'react';

const VideoPlayer = ({ src, poster }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
      {isClient && (
        <ReactPlayer
          url={src}
          light={poster ? 
            <img 
              src={poster} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover" 
            /> : false
          }
          controls
          width="100%"
          height="100%"
          style={{ aspectRatio: '16/9' }}
          playing={false}
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload', // Disable download option
              },
              hlsOptions: {
                maxBufferLength: 30,       // Reduce buffering
                maxMaxBufferLength: 60,    // Maximum buffer length
                maxBufferSize: 6000000,    // Buffer size in bytes
                maxBufferHole: 0.5,        // Max buffer hole before seeking
                abrEwmaDefaultEstimate: 500000, // Default bandwidth estimate (500kbps)
                abrBandWidthFactor: 0.8,   // Bandwidth factor
                abrBandWidthUpFactor: 0.7, // Bandwidth up factor
                abrMaxWithRealBitrate: true, // Use real bitrate
              }
            }
          }}
          progressInterval={100}
        />
      )}
    </div>
  );
};
export default VideoPlayer