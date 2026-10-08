import React from "react";
import { useSelector } from "react-redux";
import { LogOut, Upload, Video, Settings, User } from "lucide-react";
import ContinueWithGithubButton from "./ContinueWithGithubButton";
import useLogout from "@/hooks/useLogout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function Navbar() {
  const logout = useLogout();
  const navigate = useNavigate();
  const { isAuthenticated, authdata } = useSelector((state) => state.auth);

  const navItems = [
    {
      name: "Upload",
      icon: <Upload className="w-4 h-4" />,
      onClick: () => navigate("/upload"),
    },
    {
      name: "My Videos",
      icon: <Video className="w-4 h-4" />,
      onClick: () => navigate("/my-videos"),
    },
  ];

  return (
    <nav className="w-full px-6 py-3   border-b shadow-sm flex items-center justify-between fixed top-0 z-50">
      {/* Logo */}
      <div
        className="text-xl font-bold text-black"
        onClick={() => navigate("/")}
      >
        MyTube
      </div>

      {/* Authenticated nav or login button */}
      {isAuthenticated ? (
        <div className="flex items-center gap-3">
          {navItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className="flex items-center gap-2 text-sm hover:bg-gray-100 transition"
              onClick={item.onClick}
            >
              {item.icon}
              {item.name}
            </Button>
          ))}

          {authdata?.avatar_url && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <img
                  src={authdata.avatar_url}
                  alt="Profile"
                  className="w-9 h-9 rounded-full border border-gray-300 shadow-sm cursor-pointer hover:scale-105 transition"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 mt-2">
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className="flex items-center gap-2"
                >
                  <User className="w-4 h-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/settings")}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-2 text-red-600"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ) : (
        <ContinueWithGithubButton />
      )}
    </nav>
  );
}

export default Navbar;
