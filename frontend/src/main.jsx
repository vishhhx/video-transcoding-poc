import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import React from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { Provider } from "react-redux";
import { persistor, store } from "./store/store";
import GithubCallback from "./components/mycomponents/GithubCallback";
import UploadPage from "./pages/UploadPage";
import Yourvideos from "./pages/Yourvideos";
import { ThemeProvider } from "@/components/ui/theme-provider";
import VideoInfo from "./components/mycomponents/VideoInfo";
import { SocketProvider } from "./context/SocketContex";
import { PersistGate } from "redux-persist/integration/react";
import Profilepage from "./pages/Profilepage";
import Videos from "./pages/Videos";
import Watchpage from "./pages/Watchpage";
const route = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route>
        <Route element={<App />} path="/">
          <Route element={<Videos />} path="/" />
          <Route element={<UploadPage />} path="/upload" />
          <Route element={<Yourvideos />} path="/my-videos" />
          <Route element={<VideoInfo />} path="/my-videos/:videoId" />
          <Route element={<Profilepage />} path="/profile" />
          <Route element={<Watchpage />} path="/watch/:id" />
        </Route>
        <Route element={<GithubCallback />} path="/githubauth/callback" />
      </Route>
    </>
  )
);
createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <SocketProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <RouterProvider router={route} />
          <Toaster />
        </ThemeProvider>
      </SocketProvider>
    </PersistGate>
  </Provider>
);
