import { addUserAuth } from "@/store/authSlice";
import axiosInstance from "@/utils/AxiosInstance";
import React, { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
function GithubCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const code = params.get("code");
  const hasFetched = useRef(false);
  useEffect(() => {
    const fetchDetails = async () => {
      if (!code || hasFetched.current) return;
      hasFetched.current = true;
      try {
        const response = await axiosInstance.get(
          `/auth/github/callback?code=${code}`
        );
        if (!response.data) {
          throw new Error("Empty response from GitHub callback");
        }
        dispatch(addUserAuth(response.data));
        toast.success("Logged in with GitHub!");
        navigate("/");
      } catch (error) {
        console.error("Error in GitHub callback:", error);
        toast.error(
          error?.response?.data?.msg || "Error logging in with GitHub"
        );
        navigate("/");
      }
    };
    fetchDetails();
  }, [code, dispatch, navigate]);

  return <p className="text-center mt-10">Logging in via GitHub...</p>;
}
export default GithubCallback;
