import React from "react";
import { Button } from "../ui/button";
import axiosInstance from "@/utils/AxiosInstance";
import { Github } from "lucide-react";

function ContinueWithGithubButton() {
  async function handleInitGithub() {
    try {
      const res = await axiosInstance.get("/auth/github");
      window.location.href = res.data.url;
    } catch (error) {
      console.log("Error in GitHub init:", error);
    }
  }

  return (
    <div>
      <Button
        onClick={handleInitGithub}
        className="flex items-center gap-2 bg-black text-white"
        variant="outline"
      >
        <Github className="w-5 h-5" />
        Continue with GitHub
      </Button>
    </div>
  );
}

export default ContinueWithGithubButton;
