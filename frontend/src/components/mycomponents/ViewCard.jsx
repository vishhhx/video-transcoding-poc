import React from "react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router";

function ViewCard({ video }) {

  const { title, thumbnailKey, uploadedBy } = video;
  const { avatar_url, name } = uploadedBy;
    const navigate = useNavigate();
  return (
    <Card className="p-2 w-full max-w-[500px] shadow-lg hover:shadow-xl hover: transform-gpu transition-shadow duration-300 flex flex-col gap-2"
      onClick={() => navigate(`/watch/${video._id}`)}
    >
      <img
        src={thumbnailKey}
        alt={title}
        className="w-full h-64 object-cover rounded-lg mb-4"
      />
      <div className="flex items-center gap-3 px-2 pb-2">
        <img
          src={avatar_url}
          alt={`Avatar of ${name}`}
          className="w-11 h-11 rounded-full"
        />
        <div>
          <p className="font-semibold text-xl  line-clamp-2">{title}</p>
          <p className="text-sm text-gray-700 line-clamp-1">{name}</p>
        </div>
      </div>
    </Card>
  );
}

export default ViewCard;
