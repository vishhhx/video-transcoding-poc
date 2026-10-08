import React, { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import axiosInstance from "@/utils/AxiosInstance";
import axios from "axios";
import { toast } from "sonner";
import { Await, useNavigate } from "react-router";
import { RiAiGenerate2 } from "react-icons/ri";
import { RiAiGenerateText } from "react-icons/ri";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ThumbnailWizard from "@/components/mycomponents/ThumbnailWizard";

function UploadPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    watch,
    setValue,
  } = useForm();

  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isAiThumbnailDialogOpen, setIsAiThumbnailDialogOpen] = useState(false);
  const [aiThumbnailImage, setAiThumbnailImage] = useState([]);
  const [aiThumbnailPreviews, setAiThumbnailPreviews] = useState([]);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [generatedThumbnailUrl, setGeneratedThumbnailUrl] = useState(null);
  const [thumbnailwizardAnswers, setThumbnailwizardAnswers] = useState(null);
  const [isthumbnailWizardFinished, SetIsThubnailWizardFinished] =
    useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  const thumbnailFile = watch("thumbnail");
  const aiThumbnailFile = watch("thumbnails_for_ai");
  const title = watch("title");
  const description = watch("description");

  useEffect(() => {
    if (thumbnailFile && thumbnailFile[0]) {
      const file = thumbnailFile[0];
      setImageFile(file);
      const previewURL = URL.createObjectURL(file);
      setThumbnailPreview(previewURL);
      return () => URL.revokeObjectURL(previewURL);
    }
  }, [thumbnailFile]);
  useEffect(() => {
    if (aiThumbnailFile) {
      const files = Array.from(aiThumbnailFile).slice(0, 2);

      setAiThumbnailImage(files);

      const previewURLs = files.map((file) => URL.createObjectURL(file));
      setAiThumbnailPreviews(previewURLs);

      return () => {
        previewURLs.forEach((url) => URL.revokeObjectURL(url));
      };
    }
  }, [aiThumbnailFile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoIdFromParams = params.get("videoId");
    if (videoIdFromParams) {
      setVideoId(videoIdFromParams); //check in backend
      setSaved(true);
    }
  }, []);

  useEffect(() => {
    if (isAiThumbnailDialogOpen) {
      setValue("title_ai", title || "");
      setValue("description_ai", description || "");
    }
  }, [isAiThumbnailDialogOpen, title, description, setValue]);

  const onSubmit = async (data) => {
    console.log("Form data:", data);
    try {
      setIsVideoUploading;
      const response = await axiosInstance.post("/upload/createVideo", {
        title: data.title,
        description: data.description,
        isPublic: data.isPublic === "on" ? true : false,
        ContentType: imageFile ? imageFile.type : "image/jpeg",
        isThumbnail: imageFile ? true : false,
      });
      const resData = response.data;

      if (imageFile) {
        handleuploadImage(resData.signedImageUrl);
      }
      const params = new URLSearchParams(window.location.search);
      params.set("videoId", resData.videoId);
      window.history.pushState({}, "", `${window.location.pathname}?${params}`);
      setVideoId(resData.videoId);
      toast.success(
        "Video details created successfully, please upload the video now.",
      );
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleuploadImage = async (signedImageUrl) => {
    const uploadimagetotos3 = await axios.put(signedImageUrl, imageFile, {
      headers: {
        "Content-Type": imageFile.type,
      },
    });
    if (uploadimagetotos3.status === 200) {
      console.log("Thumbnail uploaded successfully");
    } else {
      console.error("Failed to upload thumbnail");
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    setVideoFile(file);
    console.log("Video file:", file);
  };

  const getsignedUrlforVideo = async () => {
    try {
      const response = await axiosInstance.get(
        `/upload/SignedUrl?uploadId=${videoId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      throw error;
    }
  };

  const handleUploadVideo = async () => {
    setIsVideoUploading(true);
    setUploadProgress(0);

    try {
      if (!videoFile) {
        toast.error("Please select a video file to upload.");
        throw new Error("No video file selected");
      }
      if (!videoId) {
        toast.error("Video ID is not set. Please create video details first.");
        throw new Error("No video ID found");
      }
      const { url } = await getsignedUrlforVideo();
      console.log("Received signed URL:", url);
      const response = await axios.put(url, videoFile, {
        headers: {
          "Content-Type": videoFile.type,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          console.log(`Upload Progress: ${percentCompleted}%`);
          setUploadProgress(percentCompleted);
        },
      });
      if (response.status === 200) {
        console.log("Video uploaded successfully");
        setUploadProgress(100);
        const response = await axiosInstance.put("/upload/updateVideoStatus", {
          videoId: videoId,
        });
        if (response) {
          toast.success("Video uploaded successfully");
          navigate(`/my-videos/${videoId}`);
        }
        setIsVideoUploading(false);
        setVideoFile(null);
      } else {
        setIsVideoUploading(false);
        setUploadProgress(0);
        console.error("Failed to upload video");
        toast.error("Failed to upload video");
      }
    } catch (error) {
      setIsVideoUploading(false);
      setUploadProgress(0);
      console.error("Error uploading video:", error);
      toast.error("Error uploading video");
    }
  };

  const handleGenerateThumbnails = async () => {
    setIsGeneratingThumbnails(true);

    try {
      if (!videoId) {
        toast.error("Create the video details before generating a thumbnail.");
        return;
      }

      const files = Array.from(aiThumbnailFile || []);
      if (!files.length) {
        toast.error("Add at least one reference image for the AI thumbnail.");
        return;
      }

      const values = getValues(["title_ai", "description_ai"]);
      if (!values[0]?.trim() && !values[1]?.trim()) {
        toast.error("Video title or description is required.");
        return;
      }

      const {
        data: { urls, keys },
      } = await axiosInstance.get(
        `/upload/thubnail-signed-url/${videoId}?NumberOfImg=${files.length}&ContentType=image/jpeg`,
      );

      await Promise.all(
        files.map(async (imageFile, idx) => {
          await axios.put(urls[idx], imageFile, {
            headers: {
              "Content-Type": imageFile.type,
            },
          });
        }),
      );

      const result = await axiosInstance.post("/ai/generate-promt", {
        title: values[0],
        description: values[1],
        thumbnailPreferences: thumbnailwizardAnswers || {},
      });

      const generated = await axiosInstance.post("/ai/init-generate-thubnail", {
        promt: result.data.raw,
        signedUrls: urls,
        keys,
        videoId,
      });
      setGeneratedThumbnailUrl(generated.data.thumbnailUrl);
      toast.success("AI thumbnail generation started.");
    } catch (error) {
      console.error(error);
      const responseData = error.response?.data;
      if (responseData instanceof Blob) {
        console.error("S3 upload response:", await responseData.text());
      }
      toast.error(
        error.response?.data?.msg ||
          (error.response?.status === 403
            ? "S3 rejected the reference image upload. Check the signed URL, bucket permissions, and CORS settings."
            : "Unable to generate the AI thumbnail."),
      );
    } finally {
      setIsGeneratingThumbnails(false);
    }
  };

  const handleThubnailwizardAnswer = (answers) => {
    setThumbnailwizardAnswers(answers);
    SetIsThubnailWizardFinished(true);
    console.log(answers);
  };

  const handleSelectGeneratedThumbnail = () => {
    if (!generatedThumbnailUrl) return;

    setThumbnailPreview(generatedThumbnailUrl);
    setIsAiThumbnailDialogOpen(false);
    toast.success("Generated thumbnail selected.");
  };

  const handleEnhancePromt = async () => {
    const values = getValues(["title_ai", "description_ai"]);
    console.log(values);
    if (!values[0]?.trim() && !values[1]?.trim()) {
      toast.error("Video title or description is required.");
      return;
    }
    try {
      const reponse = await axiosInstance.post("/ai/enhance-tubnail-Prompt", {
        title: values[0],
        description: values[1],
      });
      const enhancedPromt = reponse?.data?.enhancedPrompt;
      setValue("description_ai", enhancedPromt);
    } catch (error) {
      console.log(error);
      toast.error(
        error.response?.data?.msg || "Unable to enhance the thumbnail prompt.",
      );
    }
  };

  return (
    <div className="p-6">
      <Card className="w-full pb-20">
        <CardHeader>
          <CardTitle className="flex justify-between">
            <p className="text-2xl font-bold text-start ml-4 ">Upload Page</p>
            <p
              className={`py-2 px-3  rounded-lg ${
                saved ? "bg-orange-500 rounded-lg" : "bg-orange-100 rounded-lg"
              }`}
            >
              {saved ? "saved" : "save"}
            </p>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-row gap-4">
          <div className="flex w-3/5 p-4 h-[40rem]  overflow-clip overflow-x-hidden">
            <Card className="w-full min-h-[600px]">
              <CardContent>
                <div className="space-y-5">
                  {/* Title */}
                  <div
                    className={`space-y-3 ${
                      videoId
                        ? "pointer-events-none opacity-50 cursor-not-allowed "
                        : ""
                    } `}
                  >
                    <div className="space-y-1">
                      <Label htmlFor="title"> Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter your video title"
                        {...register("title", {
                          required: true,
                        })}
                      />
                      {errors.title && (
                        <p className="text-red-500 text-sm">
                          Title for AI is required
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="description"> Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Write a brief description..."
                        className="min-h-[100px]"
                        {...register("description", {
                          required: true,
                        })}
                      />
                      {errors.description_ai && (
                        <p className="text-red-500 text-sm">
                          Description for AI is required
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="isPublic" {...register("isPublic")} />
                      <Label htmlFor="isPublic">Make Public</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="thumbnail">Upload Thumbnail</Label>
                      <Button
                        type="button"
                        onClick={() => setIsAiThumbnailDialogOpen(true)}
                        className={"cursor-pointer"}
                      >
                        Generate thumbnail via{" "}
                        <RiAiGenerate2 className="size-5" />
                      </Button>
                    </div>
                    <Input
                      id="thumbnail"
                      type="file"
                      accept="image/jpeg"
                      {...register("thumbnail", { required: false })}
                    />
                    {thumbnailPreview && (
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail Preview"
                        className="mt-2 rounded-md max-h-40 w-auto object-contain border"
                      />
                    )}
                    {errors.thumbnail && (
                      <p className="text-red-500 text-sm">
                        Thumbnail is required
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleSubmit(onSubmit)()}
                    className="w-full mt-4"
                  >
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-px bg-gray-200 mx-2" />

          <div className="flex w-2/5 p-4 justify-center items-center">
            <Card className="w-full h-full p-6 flex items-center justify-center">
              <CardContent className="w-full space-y-4">
                <Label htmlFor="video">Upload Video</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                />
                <Button
                  type="button"
                  className="w-full"
                  disabled={isVideoUploading}
                  onClick={() => handleUploadVideo()}
                >
                  {isVideoUploading ? "Uploading..." : "Upload Video"}
                </Button>
                {isVideoUploading && (
                  <>
                    <Progress value={uploadProgress} className="mt-2" />
                    <span className="text-sm text-gray-500">
                      Upload Progress: {uploadProgress}%
                    </span>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isAiThumbnailDialogOpen}
        onOpenChange={setIsAiThumbnailDialogOpen}
      >
        <DialogContent
          showCloseButton={true}
          className="max-w-[95vw] h-[85vh] mx-auto w-full p-0 overflow-hidden flex flex-col min-h-0"
        >
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <RiAiGenerate2 className="text-orange-500" />
              AI Thumbnail Generator
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Upload reference images and we'll generate compelling thumbnails
              for your video
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="w-2/5 min-h-0 overflow-y-auto py-4 px-6 border-r">
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Video Information
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="aiTitle" className="text-sm font-medium">
                        Video Title
                      </Label>
                      <Input
                        id="aiTitle"
                        placeholder="Enter a compelling title for your video"
                        className="bg-white"
                        {...register("title_ai", {
                          required: false,
                        })}
                      />
                      {errors.title_ai && (
                        <p className="text-red-500 text-xs mt-1">
                          Title is required for better thumbnail generation
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="aiDescription"
                          className="text-sm font-medium"
                        >
                          Video Description
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-orange-600 hover:text-orange-700 cursor-pointer"
                          onClick={handleEnhancePromt}
                        >
                          <RiAiGenerateText className="w-4 h-4 mr-1" />
                          Enhance with AI
                        </Button>
                      </div>
                      <Textarea
                        id="aiDescription"
                        placeholder="Describe your video content to help generate relevant thumbnails..."
                        className="min-h-[80px] bg-white"
                        {...register("description_ai", {
                          required: false,
                        })}
                      />
                      {errors.description_ai && (
                        <p className="text-red-500 text-xs mt-1">
                          Description helps generate better thumbnails
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">
                      Reference Images
                    </h3>
                    <span className="text-xs text-gray-500">
                      {aiThumbnailPreviews.length} / 5 images
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-300 transition-colors">
                      <Input
                        id="thumbnails_for_ai"
                        type="file"
                        accept="image/jpeg"
                        className="hidden"
                        multiple
                        {...register("thumbnails_for_ai")}
                      />
                      <Label
                        htmlFor="thumbnails_for_ai"
                        className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                      >
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <RiAiGenerate2 className="w-5 h-5 text-orange-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">
                          Upload reference images
                        </p>
                        <p className="text-xs text-gray-500">
                          Select up to 5 images to help generate thumbnails
                        </p>
                      </Label>
                    </div>

                    {aiThumbnailPreviews.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                          Uploaded Images
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {aiThumbnailPreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={preview}
                                alt={`Reference ${index + 1}`}
                                className="h-40 w-60 object-fit rounded-lg border-2 border-gray-200 group-hover:border-orange-300 transition-all delay-300 group-hover:scale-110 "
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <ThumbnailWizard
                  isCompelted={isthumbnailWizardFinished}
                  onFinish={handleThubnailwizardAnswer}
                />

                <Button
                  type="button"
                  onClick={handleGenerateThumbnails}
                  disabled={
                    isGeneratingThumbnails || aiThumbnailPreviews.length === 0
                  }
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  {isGeneratingThumbnails ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating thumbnails...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RiAiGenerate2 className="w-5 h-5" />
                      Generate Thumbnails
                    </div>
                  )}
                </Button>
              </div>
            </div>

            <div className="w-3/5 min-h-0 overflow-y-auto py-4 px-6 ">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Preview & Results
                  </h3>
                  <span className="text-sm text-gray-500">
                    Generated Thumbnails
                  </span>
                </div>

                {/* Preview Placeholder */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                    {generatedThumbnailUrl ? (
                      <img
                        src={generatedThumbnailUrl}
                        alt="Generated thumbnail"
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <RiAiGenerate2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          Thumbnails will appear here after generation
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={handleSelectGeneratedThumbnail}
                    disabled={!generatedThumbnailUrl}
                    className="mt-4 w-full"
                  >
                    Use as video thumbnail
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UploadPage;
