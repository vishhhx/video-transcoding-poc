import React from "react";
import { Card } from "@/components/ui/card";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../components/ui/button";
function Profilepage() {
  const { authdata } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="min-w-full h-svh flex justify-center items-center">
      <div>
        <Card className="p-20 max-w-sm">
          <div className="flex flex-col items-center">
            <img
              src={authdata?.avatar_url}
              alt="Profile"
              className="w-40 h-40 rounded-full mb-4"
              onClick={() => setIsOpen(true)}
            />
            <h2 className="text-2xl font-semibold mb-4">{authdata?.name}</h2>
          </div>
        </Card>
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>your profile photo</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img
              src={authdata?.avatar_url}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  "https://cdn.vectorstock.com/i/500p/99/13/grey-profile-icon-placeholder-avatar-vector-38519913.jpg"; // Fallback image if the original fails to load
              }}
              alt="Profile"
              className="w-100 h-100 mb-4"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setIsOpen()}>upload a new photo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Profilepage;
