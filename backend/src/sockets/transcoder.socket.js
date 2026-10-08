const UploadModel = require("../models/upload.model");
const { getClient } = require("../config/redisConnet");

module.exports.registerTranscodingEvents=(io, socket)=>{
  const client = getClient();
  socket.on("videotranscoding-init", async ({ videoId, uploaderId, progress }) => {
    console.log(videoId);
    await UploadModel.findByIdAndUpdate(videoId, { status: "processing" });
    const socketIds = await client.sMembers(`socket:${uploaderId}`);
    socketIds.forEach((id) => {
      io.to(id).emit(`transcoding-init-${videoId}`, { msg: "Transcoding started", progress });
    });
  });
  socket.on("transcoding-progress", async ({ videoId, uploaderId, progress, file }) => {
    const socketIds = await client.sMembers(`socket:${uploaderId}`);
    socketIds.forEach((id) => {
      io.to(id).emit(`transcoding-progress-${videoId}`, {
        videoId,
        uploaderId,
        progress,
        file,
      });
    });
  });
  socket.on("videotranscoding-fail", async ({ videoId, uploaderId }) => {
    await UploadModel.findByIdAndUpdate(videoId, { status: "failed" });
    const socketIds = await client.sMembers(`socket:${uploaderId}`);
    socketIds.forEach((id) => {
      io.to(id).emit(`transcoding-fail-${videoId}`, { msg: "Transcoding failed" });
    });
  });
  socket.on("videotranscoding-done", async ({ videoId, uploaderId, progress }) => {
    console.log("hey i was called")
    await UploadModel.findByIdAndUpdate(videoId, { status: "completed" });
    const socketIds = await client.sMembers(`socket:${uploaderId}`);
    socketIds.forEach((id) => {
      io.to(id).emit(`transcoding-done-${videoId}`, { msg: "Transcoding done", progress });
    });
  });
};
