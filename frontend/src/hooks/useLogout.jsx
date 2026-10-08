import { useDispatch } from "react-redux";

import { toast } from "sonner";
import { removeUserAuth } from "@/store/authSlice";
import axiosInstance from "@/utils/AxiosInstance";
import { useNavigate } from "react-router";
const useLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
      dispatch(removeUserAuth());
      toast.success("logout successful.");
      navigate("/");
    } catch (error) {
      console.log("Error logging out:", error);
      toast.error("Error logging out. Please try again.");
    }
  };

  return logout;
};

export default useLogout;
