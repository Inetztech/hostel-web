// import { Lock } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
// } from "@/components/ui/dialog";
// import { LOCK_MESSAGE } from "@/lib/modules";

// interface Props {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   /** Display name of the locked feature, e.g. "Tenants". */
//   moduleLabel?: string;
// }

// /** Shown when a customer clicks a locked sidebar item, opens a locked URL, or a locked API answers 403. */
// export default function LockedModuleDialog({ open, onOpenChange, moduleLabel }: Props) {
//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-[400px] rounded-2xl sm:rounded-2xl overflow-hidden border-0 shadow-2xl">
//         <DialogHeader className="items-center text-center sm:text-center">
//           <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
//             <Lock className="h-6 w-6" aria-hidden="true" />
//           </div>
//           <DialogTitle>{moduleLabel ? `${moduleLabel} is locked` : "Feature locked"}</DialogTitle>
//           <DialogDescription>{LOCK_MESSAGE}</DialogDescription>
//         </DialogHeader>
//         <DialogFooter className="sm:justify-center">
//           <Button className="rounded-xl px-8" onClick={() => onOpenChange(false)}>Got it</Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }












































import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { LOCK_MESSAGE } from "@/lib/modules";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display name of the locked feature, e.g. "Tenants". */
  moduleLabel?: string;
}

/** Shown when a customer clicks a locked sidebar item, opens a locked URL, or a locked API answers 403. */
export default function LockedModuleDialog({ open, onOpenChange, moduleLabel }: Props) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl sm:rounded-2xl overflow-hidden border-0 shadow-2xl">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle>{moduleLabel ? `${moduleLabel} is locked` : "Feature locked"}</DialogTitle>
          <DialogDescription>{LOCK_MESSAGE}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" className="rounded-xl px-6" onClick={() => onOpenChange(false)}>Not now</Button>
          <Button className="rounded-xl px-6" onClick={() => { onOpenChange(false); navigate("/plans"); }}>Upgrade plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}