import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpDialog = ({ open, onOpenChange }: HelpDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Help & FAQs</DialogTitle>
        </DialogHeader>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-foreground">How do I start a call?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Click the "Start Call" button on the main screen. You can invite participants by sharing the generated call link.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-foreground">How do I join with a code?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Enter the meeting code in the "Join with Code" section and click "Join Meeting". You can get the code from the meeting host.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger className="text-foreground">How do I schedule a meeting?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Click the "Schedule Meeting" button to access the scheduling page. Fill in the meeting details and send invitations to participants.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger className="text-foreground">Can I change my camera/microphone settings?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Yes, go to Settings and toggle the camera and microphone defaults. You can also adjust these during a call.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
};
