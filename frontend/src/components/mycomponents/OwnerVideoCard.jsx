import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Eye, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router";

export default function OwnerVideoCard({ video }) {
  const {
    title,
    description,
    status,
    isPublic,
    thumbnailKey,
    isVideoUploaded,
    isThumbnailUploaded
  } = video;
  const navigate = useNavigate();
  return (
    <Card className="rounded-2xl shadow-md overflow-hidden w-full max-w-md max-h-[450px] ">
      <AspectRatio ratio={712 / 401}>
        <img
          src={thumbnailKey}
          alt={title}
          className="object-cover w-full h-full rounded-2xl pl-2 pr-2"
        />
      </AspectRatio>

      <CardContent className="p-4">
        <h2 className="text-lg font-semibold mb-1 truncate">{title}</h2>
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {description}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="secondary">{isPublic ? "Public" : "Private"}</Badge>
          {status !== "completed" && (
            <Badge variant="outline" className="capitalize">
              {status}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          {isVideoUploaded ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/my-videos/${video._id}`)}
            >
              <Eye className="w-4 h-4 mr-1" /> View
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate(`/upload?videoId=${video._id}`)}
            >
              <UploadCloud className="w-4 h-4 mr-1" /> Upload Video
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
