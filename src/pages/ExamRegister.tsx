import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "./integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, ArrowLeft, Clock, BookOpen, Loader2, AlertTriangle, Ban } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import type { Database } from "./integrations/supabase/types";
import { getDeviceFingerprint, checkExistingAttempt } from "../lib/deviceFingerprint";

type ExamSubject = Database["public"]["Enums"]["exam_subject"];

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
}

const ExamRegister = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<"Maths" | "Biology">("Maths");
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");
  const [hasExistingAttempt, setHasExistingAttempt] = useState(false);
  const [checkingDevice, setCheckingDevice] = useState(true);

  useEffect(() => {
    initializeComponent();
  }, [examId]);

  const initializeComponent = async () => {
    if (!examId) return;

    try {
      // Get device fingerprint first
      const fingerprint = await getDeviceFingerprint();
      setDeviceFingerprint(fingerprint);

      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .eq("is_active", true)
        .single();

      if (examError) throw examError;
      setExam(examData);

      // Check if device has already attempted this exam
      const alreadyAttempted = await checkExistingAttempt(examId, fingerprint);
      setHasExistingAttempt(alreadyAttempted);

    } catch (error) {
      console.error("Error initializing:", error);
    } finally {
      setLoading(false);
      setCheckingDevice(false);
    }
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim()) {
      toast({
        title: "Required fields",
        description: "Please enter your full name and phone number.",
        variant: "destructive",
      });
      return;
    }

    if (phone.trim().length < 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!deviceFingerprint) {
      toast({
        title: "Device verification failed",
        description: "Unable to verify device. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // Double-check for existing attempt before submission
    const stillHasAttempt = await checkExistingAttempt(examId!, deviceFingerprint);
    if (stillHasAttempt) {
      setHasExistingAttempt(true);
      toast({
        title: "Already attempted",
        description: "You have already attempted this exam from this device.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const sessionId = uuidv4();

      const { data, error } = await supabase
        .from("student_attempts")
        .insert({
          exam_id: examId,
          student_name: fullName.trim(),
          student_phone: phone.trim(),
          selected_subject: selectedSubject as ExamSubject,
          session_id: sessionId,
          device_fingerprint: deviceFingerprint,
        })
        .select()
        .single();

      if (error) {
        // Check if error is due to duplicate device attempt
        if (
          error.message.includes('unique_device_per_exam') || 
          error.message.includes('duplicate') || 
          error.code === '23505'
        ) {
          setHasExistingAttempt(true);
          throw new Error("You have already attempted this exam from this device.");
        }
        throw error;
      }

      // Store session ID for this attempt
      localStorage.setItem(`exam_session_${data.id}`, sessionId);

      navigate(`/exam/${examId}/take/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error starting exam",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || checkingDevice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {checkingDevice ? "Verifying device..." : "Loading exam..."}
          </p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Exam Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This exam may have been deactivated or doesn't exist.
            </p>
            <Link to="/">
              <Button variant="outline">Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show block message if device already attempted
  if (hasExistingAttempt) {
    return (
      <div className="min-h-screen bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-destructive/10" />
        
        <div className="container mx-auto max-w-2xl relative">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <Card className="shadow-xl border-0">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <Ban className="w-10 h-10 text-destructive" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-4">Already Attempted</h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You have already attempted "<strong>{exam.title}</strong>" from this device. 
                Each device is allowed only one attempt per exam to ensure fairness.
              </p>
              
              <Alert className="max-w-md mx-auto mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Why this restriction?</AlertTitle>
                <AlertDescription>
                  To maintain exam integrity and provide a fair testing environment for all students, 
                  we limit each device to one attempt per mock exam.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/">
                  <Button variant="outline" size="lg">
                    Browse Other Exams
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="container mx-auto max-w-2xl relative">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">{exam.title}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {exam.duration_minutes} minutes
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                4 Subjects
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartExam} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Select Your Fourth Subject *</Label>
                <p className="text-sm text-muted-foreground">
                  You will answer English, Physics, Chemistry, and your choice below.
                </p>
                <RadioGroup
                  value={selectedSubject}
                  onValueChange={(val) => setSelectedSubject(val as "Maths" | "Biology")}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="Maths" id="maths" className="peer sr-only" />
                    <Label
                      htmlFor="maths"
                      className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      Mathematics
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="Biology" id="biology" className="peer sr-only" />
                    <Label
                      htmlFor="biology"
                      className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      Biology
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Exam Rules */}
              <Card className="bg-warning/5 border-warning/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-warning">
                    <AlertTriangle className="w-4 h-4" />
                    Important Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><strong>One attempt per device:</strong> You can only take this exam once from this device</li>
                    <li>You have <strong>3 chances</strong> before the exam automatically ends</li>
                    <li>Leaving the exam page deducts 1 chance</li>
                    <li>Exiting fullscreen mode deducts 1 chance</li>
                    <li>The exam ends automatically when all chances are used</li>
                    <li>You cannot pause or resume the exam</li>
                  </ul>
                </CardContent>
              </Card>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start Exam"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExamRegister;